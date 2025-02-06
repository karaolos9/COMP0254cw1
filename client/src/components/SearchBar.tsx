import React, { useState } from 'react';
import '../styles/SearchBar.css';

interface SearchBarProps {
  onSearch: (searchTerm: string, selectedTypes: string[]) => void;
}

export function SearchBar({ onSearch }: SearchBarProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const pokemonTypes = [
    'Normal', 'Fire', 'Water', 'Electric', 'Grass', 'Ice',
    'Fighting', 'Poison', 'Ground', 'Flying', 'Psychic', 'Bug',
    'Rock', 'Ghost', 'Dragon', 'Dark', 'Steel', 'Fairy', 'Light'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm, selectedTypes);
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const newTypes = prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type];
      onSearch(searchTerm, newTypes); // Trigger search on type change
      return newTypes;
    });
  };

  const clearTypes = () => {
    setSelectedTypes([]);
    onSearch(searchTerm, []); // Update search with empty types
  };

  return (
    <div className="search-section">
      <form className="search-container" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search Pokemon..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-button">
          <i className="fas fa-search"></i>
        </button>
      </form>

      <div className="type-filter">
        <div className="type-filter-controls">
          <button 
            className="type-dropdown-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            {selectedTypes.length ? `${selectedTypes.length} Types Selected` : 'Select Types'}
            <i className={`fas fa-chevron-${isDropdownOpen ? 'up' : 'down'}`}></i>
          </button>
          <button 
            className="clear-types-button"
            onClick={clearTypes}
            title="Clear all selected types"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>

        {isDropdownOpen && (
          <div className="type-dropdown-content">
            {pokemonTypes.map(type => (
              <label key={type} className="type-option">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type)}
                  onChange={() => toggleType(type)}
                />
                <span className={`type-badge ${type.toLowerCase()}`}>{type}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 