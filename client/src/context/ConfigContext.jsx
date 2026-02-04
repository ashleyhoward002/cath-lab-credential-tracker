import { createContext, useState, useContext, useEffect } from 'react';
import { configAPI } from '../utils/api';

const ConfigContext = createContext(null);

export const ConfigProvider = ({ children }) => {
  const [config, setConfig] = useState({ demoMode: false, version: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configAPI.getConfig()
      .then(res => setConfig(res.data))
      .catch(() => setConfig({ demoMode: false, version: '' }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ConfigContext.Provider value={{ ...config, loading }}>
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};
