import { useState, useRef } from 'react';
import { contactsAPI } from '../utils/api';

export default function AddContactModal({ categories, onClose, onSaved }) {
  const [step, setStep] = useState('choose'); // 'choose', 'manual', 'scan', 'review'
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    title: '',
    company: '',
    email: '',
    phone: '',
    phone_secondary: '',
    website: '',
    category_id: '',
    notes: '',
    card_image_path: '',
    card_raw_text: '',
  });

  // OCR state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [rawText, setRawText] = useState('');
  const fileInputRef = useRef(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!imageFile) return;

    setScanning(true);
    setScanProgress(0);
    setError('');

    try {
      // Dynamically import Tesseract.js
      const Tesseract = await import('tesseract.js');

      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        },
      });

      const text = result.data.text;
      setRawText(text);

      // Parse the extracted text
      const parsed = parseBusinessCardText(text);
      setFormData((prev) => ({
        ...prev,
        name: parsed.name || prev.name,
        email: parsed.email || prev.email,
        phone: parsed.phone || prev.phone,
        company: parsed.company || prev.company,
        title: parsed.title || prev.title,
        website: parsed.website || prev.website,
        card_raw_text: text,
      }));

      // Upload the card image
      const uploadFormData = new FormData();
      uploadFormData.append('card', imageFile);
      const uploadRes = await contactsAPI.uploadCard(uploadFormData);
      setFormData((prev) => ({ ...prev, card_image_path: uploadRes.data.path }));

      setStep('review');
    } catch (err) {
      console.error('OCR error:', err);
      setError('Failed to scan business card. Please try again or enter manually.');
    } finally {
      setScanning(false);
    }
  };

  const parseBusinessCardText = (text) => {
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    const result = { name: '', title: '', company: '', email: '', phone: '', website: '' };

    // Email regex
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    if (emailMatch) result.email = emailMatch[0].toLowerCase();

    // Website regex
    const websiteMatch = text.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/i);
    if (websiteMatch && !websiteMatch[0].includes('@')) {
      result.website = websiteMatch[0].startsWith('http') ? websiteMatch[0] : `https://${websiteMatch[0]}`;
    }

    // Phone regex (various formats)
    const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) result.phone = phoneMatch[0];

    // Name: often first line or line with 2-3 capitalized words
    for (const line of lines) {
      if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(line) && line.length < 40 && !line.includes('@')) {
        result.name = line;
        break;
      }
    }

    // Title keywords
    const titleKeywords = [
      'manager', 'director', 'representative', 'rep', 'specialist',
      'coordinator', 'supervisor', 'engineer', 'consultant', 'sales',
      'president', 'vp', 'ceo', 'cto', 'physician', 'doctor', 'md', 'do',
      'nurse', 'rn', 'pa', 'np', 'account', 'territory'
    ];
    for (const line of lines) {
      if (titleKeywords.some((kw) => line.toLowerCase().includes(kw))) {
        if (!result.name || line !== result.name) {
          result.title = line;
          break;
        }
      }
    }

    // Company: often has Inc, LLC, Corp, or is a distinct line
    const companyKeywords = [
      'inc', 'llc', 'corp', 'company', 'co', 'ltd', 'medical', 'healthcare',
      'systems', 'solutions', 'technologies', 'pharmaceuticals', 'pharma',
      'devices', 'equipment', 'surgical', 'cardio', 'bio'
    ];
    for (const line of lines) {
      if (companyKeywords.some((kw) => line.toLowerCase().includes(kw))) {
        result.company = line;
        break;
      }
    }

    return result;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (!formData.name.trim()) {
        setError('Contact name is required');
        setSaving(false);
        return;
      }

      await contactsAPI.create(formData);
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const renderChooseStep = () => (
    <div className="p-6 space-y-6">
      <p className="text-gray-600 text-center">How would you like to add a contact?</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setStep('manual')}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
        >
          <div className="text-4xl mb-2">✏️</div>
          <div className="font-medium">Manual Entry</div>
          <div className="text-sm text-gray-500">Type contact info</div>
        </button>
        <button
          onClick={() => setStep('scan')}
          className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-center"
        >
          <div className="text-4xl mb-2">📷</div>
          <div className="font-medium">Scan Business Card</div>
          <div className="text-sm text-gray-500">Upload card image</div>
        </button>
      </div>
    </div>
  );

  const renderScanStep = () => (
    <div className="p-6 space-y-4">
      <div className="text-center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {!imagePreview ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-8 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <div className="text-4xl mb-2">📷</div>
            <div className="font-medium">Click to upload business card image</div>
            <div className="text-sm text-gray-500">JPG, PNG, or GIF</div>
          </button>
        ) : (
          <div className="space-y-4">
            <img
              src={imagePreview}
              alt="Business card preview"
              className="max-h-64 mx-auto rounded-lg shadow"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Choose different image
            </button>
          </div>
        )}
      </div>

      {scanning && (
        <div className="space-y-2">
          <div className="text-center text-sm text-gray-600">Scanning... {scanProgress}%</div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${scanProgress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={() => setStep('choose')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Back
        </button>
        <div className="space-x-3">
          <button
            onClick={() => {
              setStep('manual');
              setImagePreview(null);
              setImageFile(null);
            }}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Enter Manually Instead
          </button>
          <button
            onClick={handleScan}
            disabled={!imageFile || scanning}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {scanning ? 'Scanning...' : 'Scan Card'}
          </button>
        </div>
      </div>
    </div>
  );

  const renderForm = () => (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {step === 'review' && rawText && (
        <div className="bg-gray-50 p-3 rounded-lg text-sm">
          <div className="font-medium text-gray-700 mb-1">Extracted Text:</div>
          <div className="text-gray-600 whitespace-pre-wrap max-h-24 overflow-y-auto">
            {rawText}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Name *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g., Sales Representative"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Company
          </label>
          <input
            type="text"
            name="company"
            value={formData.company}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Secondary Phone
          </label>
          <input
            type="tel"
            name="phone_secondary"
            value={formData.phone_secondary}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Website
          </label>
          <input
            type="url"
            name="website"
            value={formData.website}
            onChange={handleChange}
            placeholder="https://example.com"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            name="category_id"
            value={formData.category_id}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">No Category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <button
          type="button"
          onClick={() => step === 'review' ? setStep('scan') : setStep('choose')}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Contact'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-xl font-semibold">
            {step === 'choose' && 'Add New Contact'}
            {step === 'scan' && 'Scan Business Card'}
            {step === 'manual' && 'Enter Contact Details'}
            {step === 'review' && 'Review & Edit'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 'choose' && renderChooseStep()}
        {step === 'scan' && renderScanStep()}
        {(step === 'manual' || step === 'review') && renderForm()}
      </div>
    </div>
  );
}
