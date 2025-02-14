import React, { useState } from 'react';
import '../styles/SearchBar.css';

interface SearchBarProps {
  onSearch: (searchTerm: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Sanitize the input, trim whitespace and remove special characters
    const rawInput = e.target.value;
    const sanitizedInput = rawInput
      .trim()
      .replace(/[^\w\s-]/g, '')
      .slice(0, 50);

    setSearchTerm(sanitizedInput);
    onSearch(sanitizedInput);
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
          placeholder="Search Pokémon..."
          value={searchTerm}
          onChange={handleChange}
          className="search-input"
          aria-label="Search Pokemon"
          maxLength={50}
        />
      </form>
    </div>
  );
}; 