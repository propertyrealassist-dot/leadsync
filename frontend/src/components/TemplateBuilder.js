import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

function TemplateBuilder() {
  const [templates, setTemplates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    tag: '',
    brief: '',
    tone: 'Friendly and Casual',
    initialMessage: '',
    objective: '',
    companyInformation: ''
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/templates`);
      setTemplates(res.data);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.post(`${API_URL}/api/templates`, {
        ...formData,
        qualificationQuestions: [
          { Body: JSON.stringify({ text: "What are you looking for today?" }), Delay: 1 },
          { Body: JSON.stringify({ text: "When would you like to get started?" }), Delay: 1 }
        ],
        followUps: [
          { Body: "Just checking in - still interested?", Delay: 180 },
          { Body: "No worries if now's not the right time. Feel free to reach out anytime!", Delay: 7200 }
        ],
        customActions: {
          APPOINTMENT_BOOKED: [{
            rule_condition: "Trigger when you agree and confirm a booking slot",
            chains: [{
              chain_name: "Confirm Booking",
              chain_order: 1,
              steps: [{ step_order: 1, function: "HANDLE_BOOKING", parameters: {} }]
            }]
          }],
          LEAD_LOST: [{
            rule_condition: "Trigger when lead is disqualified or opts out",
            chains: [{
              chain_name: "Handle Lost Lead",
              chain_order: 1,
              steps: [
                { step_order: 1, function: "TURN_OFF_AI", parameters: {} },
                { step_order: 2, function: "ADD_TAGS", parameters: { tags: ["lost", "not-interested"] } }
              ]
            }]
          }]
        }
      });
      
      alert('Template created successfully!');
      setShowForm(false);
      setFormData({
        name: '',
        tag: '',
        brief: '',
        tone: 'Friendly and Casual',
        initialMessage: '',
        objective: '',
        companyInformation: ''
      });
      loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Error creating template');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const deleteTemplate = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/templates/${id}`);
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const importJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonData = JSON.parse(event.target.result);
          await axios.post(`${API_URL}/templates`, jsonData);
          alert('Template imported successfully!');
          loadTemplates();
        } catch (error) {
          console.error('Error importing template:', error);
          alert('Error importing template');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="template-builder">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1>Template Builder</h1>
        <div>
          <button className="btn btn-secondary" onClick={importJSON} style={{ marginRight: '1rem' }}>
            Import JSON
          </button>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ New Template'}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <h2>Create New Template</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Template Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="e.g., Gyms Template"
              />
            </div>

            <div className="form-group">
              <label>Tag *</label>
              <input
                type="text"
                name="tag"
                value={formData.tag}
                onChange={handleChange}
                required
                placeholder="e.g., gyms"
              />
            </div>

            <div className="form-group">
              <label>Tone</label>
              <select name="tone" value={formData.tone} onChange={handleChange}>
                <option>Friendly and Casual</option>
                <option>Professional</option>
                <option>Enthusiastic</option>
                <option>Formal</option>
              </select>
            </div>

            <div className="form-group">
              <label>Initial Message *</label>
              <textarea
                name="initialMessage"
                value={formData.initialMessage}
                onChange={handleChange}
                required
                placeholder="Hey it's Sam from Company. Can you confirm this is {{contact.first_name}}?"
              />
            </div>

            <div className="form-group">
              <label>Objective *</label>
              <input
                type="text"
                name="objective"
                value={formData.objective}
                onChange={handleChange}
                required
                placeholder="Convert qualified leads into booked appointments"
              />
            </div>

            <div className="form-group">
              <label>AI Agent Brief *</label>
              <textarea
                name="brief"
                value={formData.brief}
                onChange={handleChange}
                required
                placeholder="Describe who the AI is, how it should behave, conversation rules, etc..."
                style={{ minHeight: '200px' }}
              />
            </div>

            <div className="form-group">
              <label>Company Information</label>
              <textarea
                name="companyInformation"
                value={formData.companyInformation}
                onChange={handleChange}
                placeholder="Brief description of your company and services..."
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Create Template
            </button>
          </form>
        </div>
      )}

      <div className="card">
        <h2>Your Templates</h2>
        {templates.length === 0 ? (
          <div className="empty-state">
            <h3>No templates yet</h3>
            <p>Create your first template or import the Gyms template JSON</p>
          </div>
        ) : (
          <ul className="list">
            {templates.map(template => (
              <li key={template.id} className="list-item">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{template.name}</strong>
                    <div style={{ fontSize: '0.9rem', color: '#718096', marginTop: '0.25rem' }}>
                      Tag: {template.tag} | Tone: {template.tone}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#a0aec0', marginTop: '0.25rem' }}>
                      {template.objective}
                    </div>
                  </div>
                  <button 
                    className="btn btn-danger"
                    onClick={() => deleteTemplate(template.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default TemplateBuilder;