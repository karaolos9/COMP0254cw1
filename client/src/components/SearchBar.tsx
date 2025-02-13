import React, { useState } from 'react';
import '../styles/SearchBar.css';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    onSearch(newSearchTerm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <div className="search-section">
      <form className="search-container" onSubmit={handleSubmit}>
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder="Search Pokemon..."
          value={searchTerm}
          onChange={handleChange}
          className="search-input"
        />
      </form>
    </div>
  );
}; 