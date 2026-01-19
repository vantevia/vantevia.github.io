import React, { useState } from 'react';

export const PasswordModal: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const expectedPassword = import.meta.env.VITE_EDITOR_PASSWORD;
    
    if (password === expectedPassword) {
      localStorage.setItem('editorAuth', 'true');
      sessionStorage.setItem('editorAuthTime', new Date().getTime().toString());
      onSuccess();
    } else {
      setError('Invalid password');
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-8 rounded-lg border border-gray-700 max-w-sm w-full mx-4">
        <h2 className="text-2xl font-bold mb-2 text-white">Editor Access</h2>
        <p className="text-gray-400 text-sm mb-6">Enter the password to access the data editor</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            placeholder="Enter password"
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white mb-4 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded font-semibold text-white transition-colors"
          >
            Unlock Editor
          </button>
        </form>
      </div>
    </div>
  );
};
