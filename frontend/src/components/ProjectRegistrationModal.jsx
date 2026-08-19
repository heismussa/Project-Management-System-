import React, { useState } from 'react';
import api from '../api';

const categoryTypeMap = {
  System: ['Web App', 'Desktop Software', 'API Service'],
  Infrastructure: ['Network Setup', 'Server Deployment', 'Cloud Migration'],
  Security: ['Audit & Compliance', 'Penetration Testing', 'IAM Implementation'],
};

export default function ProjectRegistrationModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    budget: '',
    category: '',
    type: '',
    startDate: '',
    endDate: '',
    assignedPlanner: '',
  });

  const [availableTypes, setAvailableTypes] = useState([]);

  if (!isOpen) return null;

  const handleCategoryChange = (e) => {
    const category = e.target.value;
    setFormData({ ...formData, category, type: '' });
    setAvailableTypes(categoryTypeMap[category] || []);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/projects', formData);
      alert('Project registered successfully!');
      onClose();
    } catch (err) {
      alert('Failed to register project.');
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: '#fff', padding: '20px', borderRadius: '5px', width: '400px' }}>
        <h3>Register New Project</h3>
        <form onSubmit={handleSubmit}>
          <input type="text" name="name" placeholder="Project Name" onChange={handleChange} required style={{ width: '100%', marginBottom: '10px' }} />
          <textarea name="description" placeholder="Description" onChange={handleChange} required style={{ width: '100%', marginBottom: '10px' }} />
          <input type="number" name="budget" placeholder="Budget" onChange={handleChange} required style={{ width: '100%', marginBottom: '10px' }} />

          {/* Dynamic Category Dropdown */}
          <select name="category" onChange={handleCategoryChange} required style={{ width: '100%', marginBottom: '10px' }}>
            <option value="">Select Category</option>
            <option value="System">System</option>
            <option value="Infrastructure">Infrastructure</option>
            <option value="Security">Security</option>
          </select>

          {/* Dependent Type Dropdown */}
          <select name="type" value={formData.type} onChange={handleChange} required disabled={!formData.category} style={{ width: '100%', marginBottom: '10px' }}>
            <option value="">Select Type</option>
            {availableTypes.map((typeOption) => (
              <option key={typeOption} value={typeOption}>{typeOption}</option>
            ))}
          </select>

          <input type="date" name="startDate" onChange={handleChange} required style={{ width: '100%', marginBottom: '10px' }} />
          <input type="date" name="endDate" onChange={handleChange} required style={{ width: '100%', marginBottom: '10px' }} />

          {/* Assign Planner Dropdown */}
          <select name="assignedPlanner" onChange={handleChange} required style={{ width: '100%', marginBottom: '10px' }}>
            <option value="">Assign Planner</option>
            <option value="Planner Alex">Planner Alex</option>
            <option value="Planner Sarah">Planner Sarah</option>
          </select>

          <button type="submit" style={{ padding: '8px 12px', marginRight: '10px' }}>Submit</button>
          <button type="button" onClick={onClose} style={{ padding: '8px 12px' }}>Cancel</button>
        </form>
      </div>
    </div>
  );
}