 import React, { useState } from 'react'; import api from '../api/axios'; 
 
const CATEGORY_MAP = { 
  System: ['CFMS', 'ERP', 'HRMS', 'IPEMS', 'Other'], 
  Infrastructure: ['Network', 'Working Tools', 'Data Center', 'Server or Database', 'Other'], 
  Security: ['Control', 'Vulnerability', 'Other'] 
}; 
 
export default function ProjectRegistration() {   const [formData, setFormData] = useState({     name: '', description: '', budget: '', category: '', activity_name: '', custom_activity: '', planner_id: '' 
  }); 
  const [subActivities, setSubActivities] = useState([]);   const [isModalOpen, setIsModalOpen] = useState(false);   const [planners] = useState([     { id: 1, name: 'Alice Planner' }, 
    { id: 2, name: 'Bob Planner' } 
  ]); 
 
  const handleCategoryChange = (e) => {     const selectedCat = e.target.value; 
    setFormData({ ...formData, category: selectedCat, activity_name: '', custom_activity: '' });     setSubActivities(CATEGORY_MAP[selectedCat] || []); 
  }; 
 
  const handleSubmit = async (e) => {     e.preventDefault(); 
    try { 
      await api.post('/projects', formData);       alert('Project registered successfully!'); 
    } catch (err) {       alert('Failed to register project'); 
    } 
  }; 
 
  return ( 
    <div className="max-w-4xl bg-white p-6 rounded-xl shadow space-y-6"> 
      <div className="flex justify-between items-center border-b pb-4"> 
        <h2 className="text-xl font-bold text-gray-800">New Project Registration</h2>         <button type="button" onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white text-sm px-4 py-2 rounded"> 
          {formData.planner_id ? 'Change Planner' : 'Assign Planner'} 
        </button> 
      </div> 
 
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4"> 
        <div className="col-span-2"> 
          <label className="block text-sm font-medium">Project Name</label>           <input type="text" required className="w-full border p-2 rounded mt-1"              onChange={e => setFormData({...formData, name: e.target.value})} /> 
        </div> 
         
        <div className="col-span-2"> 
          <label className="block text-sm font-medium">Description</label> 
          <textarea className="w-full border p-2 rounded mt-1"  
            onChange={e => setFormData({...formData, description: e.target.value})} />         </div> 
 
        <div> 
          <label className="block text-sm font-medium">Budget / Cost</label>           <input type="number" required className="w-full border p-2 rounded mt-1"              onChange={e => setFormData({...formData, budget: e.target.value})} />         </div> 
 
        <div> 
          <label className="block text-sm font-medium">Category</label>           <select required className="w-full border p-2 rounded mt-1" onChange={handleCategoryChange}> 
            <option value="">Select Category</option> 
            <option value="System">System</option> 
            <option value="Infrastructure">Infrastructure</option> 
            <option value="Security">Security</option> 
          </select> 
        </div> 
 
        {formData.category && ( 
          <div> 
            <label className="block text-sm font-medium">Activity</label>             <select required className="w-full border p-2 rounded mt-1"                onChange={e => setFormData({...formData, activity_name: e.target.value})}> 
              <option value="">Select Activity</option> 
              {subActivities.map(act => <option key={act} value={act}>{act}</option>)} 
            </select> 
          </div> 
        )} 
 
        {formData.activity_name === 'Other' && ( 
          <div> 
            <label className="block text-sm font-medium">Manual Activity Name</label>             <input type="text" required className="w-full border p-2 rounded mt-1"                onChange={e => setFormData({...formData, custom_activity: e.target.value})} /> 
          </div> 
        )} 
 
        <div className="col-span-2 pt-4 border-t"> 
          <button type="submit" className="bg-blue-600 text-white font-semibold px-6 py-2 rounded hover:bg-blue-700"> 
            Submit Registration 
          </button> 
        </div> 
      </form> 
 
      {/* Assign Planner Modal */} 
      {isModalOpen && ( 
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"> 
          <div className="bg-white rounded-lg p-6 max-w-md w-full space-y-4"> 
            <h3 className="text-lg font-bold">Assign Project Planner</h3> 
            <select className="w-full border p-2 rounded"                onChange={e => setFormData({...formData, planner_id: e.target.value})}> 
              <option value="">Select Planner</option> 
              {planners.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}             </select> 
            <div className="flex justify-end gap-2"> 
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded">Cancel</button> 
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded">Save</button> 
            </div> 
          </div> 
        </div> 
      )} 
    </div> 
  ); 
} 
 
