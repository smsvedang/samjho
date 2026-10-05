import React from 'react';
import { ChatWindow } from '../components/ChatWindow';

interface ChatPageProps {
  onNavigate: (route: '/' | '/chat' | '/privacy' | '/safety' | '/about') => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({
  onNavigate,
  isDarkMode,
  toggleDarkMode,
}) => {
  return (
    <ChatWindow
      onNavigate={onNavigate}
      isDarkMode={isDarkMode}
      toggleDarkMode={toggleDarkMode}
    />
  );
};
