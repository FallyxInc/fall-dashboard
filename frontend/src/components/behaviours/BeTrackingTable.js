import React, { useState, useEffect } from 'react';

const BeTrackingTable = ({filteredData, cleanDuplicateText, storageKey = 'behaviours_checked_items'}) => {
    const [checkedItems, setCheckedItems] = useState(new Set());

    // Load checked items from localStorage on component mount
    useEffect(() => {
        try {
            const savedCheckedItems = localStorage.getItem(storageKey);
            if (savedCheckedItems) {
                const parsedItems = JSON.parse(savedCheckedItems);
                setCheckedItems(new Set(parsedItems));
            }
        } catch (error) {
            console.error('Error loading checked items from localStorage:', error);
        }
    }, [storageKey]);

    // Save checked items to localStorage whenever checkedItems changes
    useEffect(() => {
        try {
            localStorage.setItem(storageKey, JSON.stringify([...checkedItems]));
        } catch (error) {
            console.error('Error saving checked items to localStorage:', error);
        }
    }, [checkedItems, storageKey]);

    // Handle checkbox change
    const handleCheckboxChange = (incidentNumber) => {
        setCheckedItems(prev => {
            const newCheckedItems = new Set(prev);
            if (newCheckedItems.has(incidentNumber)) {
                newCheckedItems.delete(incidentNumber);
            } else {
                newCheckedItems.add(incidentNumber);
            }
            return newCheckedItems;
        });
    };

    // Clear all checked items (optional utility function)
    const clearAllChecked = () => {
        setCheckedItems(new Set());
    };

    return (
        <div>
            {/* Optional: Add a utility button to clear all checked items */}
            {checkedItems.size > 0 && (
                <div style={{ marginBottom: '10px', textAlign: 'right' }}>
                    <button 
                        onClick={clearAllChecked}
                        style={{
                            padding: '5px 10px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        Clear All Checked ({checkedItems.size})
                    </button>
                </div>
            )}
            
            <table style={{ width: '100%' }}>
                <thead>
                    <tr>
                        <th style={{ fontSize: '18px', width: '50px' }}>✓</th>
                        <th style={{ fontSize: '18px' }}>#</th>
                        <th style={{ fontSize: '18px' }}>Resident Name</th>
                        <th style={{ fontSize: '18px' }}>Date</th>
                        <th style={{ fontSize: '18px' }}>Incident Location</th>
                        <th style={{ fontSize: '18px' }}>Incident Type</th>
                        <th style={{ fontSize: '18px' }}>Whose Affected</th>
                        <th style={{ fontSize: '18px' }}>PRN</th>
                        <th style={{ fontSize: '18px' }}>Code White</th>
                        <th style={{ fontSize: '18px' }}>Summary</th>
                        <th style={{ fontSize: '18px' }}>Triggers</th>
                        <th style={{ fontSize: '18px' }}>Interventions</th>
                        <th style={{ fontSize: '18px' }}>Injuries</th>
                        <th style={{ fontSize: '18px' }}>Potential CI</th>
                    </tr>
                </thead>
                <tbody id="fallsTableBody">
                    {filteredData && filteredData.map((item, i) => {
                        const isChecked = checkedItems.has(item.incident_number);
                        const rowStyle = isChecked ? { 
                            opacity: '0.6', 
                            backgroundColor: '#f8f9fa',
                            textDecoration: 'line-through'
                        } : {};
                        
                        return (
                            <tr key={i} style={rowStyle}>
                                <td style={{ fontSize: '16px', textAlign: 'center' }}>
                                    <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => handleCheckboxChange(item.incident_number)}
                                        style={{ 
                                            width: '18px', 
                                            height: '18px',
                                            cursor: 'pointer'
                                        }}
                                    />
                                </td>
                                <td style={{ fontSize: '16px' }}>{item.incident_number}</td>
                                <td style={{ fontSize: '16px' }}>{item.name}</td>
                                <td style={{ fontSize: '16px' }}>{item.date}</td>
                                <td style={{ fontSize: '16px' }}>{item.incident_location}</td>
                                <td style={{ fontSize: '16px' }}>{item.incident_type}</td>
                                <td style={{ fontSize: '16px' }}>{item.who_affected}</td>
                                <td style={{ fontSize: '16px' }}>{item.prn}</td>
                                <td style={{ fontSize: '16px' }}>{item.code_white}</td>
                                <td style={{ 
                                    fontSize: '16px',
                                    backgroundColor: item.summary?.includes('No Progress') && item.summary?.includes('24hrs of RIM') ? '#ffcdd2' : 'transparent'
                                }}>{item.summary}</td>
                                <td style={{ 
                                    fontSize: '16px',
                                    backgroundColor: cleanDuplicateText(item.triggers, 'triggers')?.includes('No Progress') && cleanDuplicateText(item.triggers, 'triggers')?.includes('24hrs of RIM') ? '#ffcdd2' : 'transparent'
                                }}>{cleanDuplicateText(item.triggers, 'triggers')}</td>
                                <td style={{ 
                                    fontSize: '16px',
                                    backgroundColor: cleanDuplicateText(item.interventions, 'interventions')?.includes('No Progress') && cleanDuplicateText(item.interventions, 'interventions')?.includes('24hrs of RIM') ? '#ffcdd2' : 'transparent'
                                }}>{cleanDuplicateText(item.interventions, 'interventions')}</td>
                                <td style={{ fontSize: '16px' }}>{item.injuries}</td>
                                <td style={{ fontSize: '16px' }}>{item.CI || "Still Gathering Data/Unknown"}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default BeTrackingTable;