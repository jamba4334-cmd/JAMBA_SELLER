import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import your Seller Dashboard from the new Pages folder
import SellerDashboard from './Pages/Seller';

function App() {
  return (
    <Router>
      <Routes>
        {/* Set the Seller Dashboard as the main home page */}
        <Route path="/" element={<SellerDashboard />} />
      </Routes>
    </Router>
  );
}

export default App;