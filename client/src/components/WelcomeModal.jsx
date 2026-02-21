import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const WELCOME_STORAGE_KEY = 'cath-lab-welcome-seen';
const WELCOME_VERSION = '1'; // Increment to show modal again for all users

export default function WelcomeModal() {
  const { user, isCoordinator, isManager, isStaff } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check if user has seen this version of the welcome modal
    const seenVersion = localStorage.getItem(`${WELCOME_STORAGE_KEY}-${user.username}`);

    if (seenVersion !== WELCOME_VERSION) {
      setIsOpen(true);
    }
  }, [user]);

  const handleClose = () => {
    // Mark as seen
    localStorage.setItem(`${WELCOME_STORAGE_KEY}-${user.username}`, WELCOME_VERSION);
    setIsOpen(false);
    setStep(0);
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (!isOpen) return null;

  // Different content based on role
  const coordinatorSteps = [
    {
      title: "Welcome to Cath Lab Credential Tracker!",
      icon: "👋",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            This system helps you track and manage credentials for your cath lab team.
            Let's walk through how to get started.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-800 text-sm">
              <strong>Pro tip:</strong> You can always access this guide later by clicking "Help" in the navigation menu.
            </p>
          </div>
        </div>
      )
    },
    {
      title: "Step 1: Set Up Credential Types",
      icon: "📋",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            First, define what credentials your department needs to track.
          </p>
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 text-white">
            <p className="font-medium mb-2">Go to: Credential Types</p>
            <p className="text-sm text-blue-100">Add items like BLS, ACLS, State License, Annual Competencies, etc.</p>
          </div>
          <p className="text-gray-600 text-sm">
            These become the dropdown options when assigning credentials to staff members.
          </p>
        </div>
      )
    },
    {
      title: "Step 2: Add Your Staff",
      icon: "👥",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Next, add your team members to the system.
          </p>
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-4 text-white">
            <p className="font-medium mb-2">Go to: Staff → Add New Staff</p>
            <p className="text-sm text-green-100">Enter their name, role, employment type (FTE, PRN, Traveler, Contract)</p>
          </div>
          <p className="text-gray-600 text-sm">
            For travelers, you can also track agency info and contract dates.
          </p>
        </div>
      )
    },
    {
      title: "Step 3: Assign Credentials",
      icon: "🎫",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Now assign credentials to each staff member and set expiration dates.
          </p>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-4 text-white">
            <p className="font-medium mb-2">Click any staff member → Add Credential</p>
            <p className="text-sm text-purple-100">Select the credential type, enter the expiration date, and upload supporting docs</p>
          </div>
          <p className="text-gray-600 text-sm">
            The dashboard will automatically show you what's expiring soon or overdue.
          </p>
        </div>
      )
    },
    {
      title: "Step 4: Give Others Access (Optional)",
      icon: "🔑",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Want managers or staff to log in? Create user accounts for them.
          </p>
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg p-4 text-white">
            <p className="font-medium mb-2">Go to: Users → Add User</p>
            <p className="text-sm text-amber-100">Choose their role: Coordinator (full access), Manager (edit access), or Staff (view own only)</p>
          </div>
          <p className="text-gray-600 text-sm">
            Staff users must be linked to a staff member to see their credentials.
          </p>
        </div>
      )
    },
    {
      title: "You're All Set!",
      icon: "🎉",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            That's the basics! Here's a quick summary:
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📋</div>
              <div className="font-medium">Credential Types</div>
              <div className="text-gray-500">What to track</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">👥</div>
              <div className="font-medium">Staff</div>
              <div className="text-gray-500">Who to track</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📊</div>
              <div className="font-medium">Dashboard</div>
              <div className="text-gray-500">Status overview</div>
            </div>
            <div className="bg-amber-50 rounded-lg p-3 text-center">
              <div className="text-2xl mb-1">📈</div>
              <div className="font-medium">Reports</div>
              <div className="text-gray-500">Compliance reports</div>
            </div>
          </div>
          <p className="text-gray-600 text-sm text-center mt-4">
            Click "Get Started" to begin, or "Help" in the menu anytime for more guidance.
          </p>
        </div>
      )
    }
  ];

  const managerSteps = [
    {
      title: "Welcome!",
      icon: "👋",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            As a manager, you can view the dashboard, manage staff credentials, and run reports.
          </p>
          <p className="text-gray-600 text-sm">
            Your coordinator handles credential types and user accounts. Contact them if you need changes there.
          </p>
        </div>
      )
    }
  ];

  const staffSteps = [
    {
      title: "Welcome!",
      icon: "👋",
      content: (
        <div className="space-y-4">
          <p className="text-gray-700">
            Your "My Credentials" page shows all credentials assigned to you.
          </p>
          <p className="text-gray-600 text-sm">
            You can view expiration dates and upload supporting documents. Contact your coordinator if anything needs updating.
          </p>
        </div>
      )
    }
  ];

  const steps = isCoordinator ? coordinatorSteps : isManager ? managerSteps : staffSteps;
  const totalSteps = steps.length;
  const currentStep = steps[step];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-3xl">{currentStep.icon}</span>
              <h2 className="text-xl font-bold">{currentStep.title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="text-white/70 hover:text-white text-2xl leading-none"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep.content}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex space-x-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition ${
                  i === step ? 'bg-blue-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            {step > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
            >
              {step === totalSteps - 1 ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Export a function to reset the welcome modal (for testing or forcing it to show again)
export const resetWelcomeModal = (username) => {
  localStorage.removeItem(`${WELCOME_STORAGE_KEY}-${username}`);
};
