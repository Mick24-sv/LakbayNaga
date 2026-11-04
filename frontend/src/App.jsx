import { useEffect, useState } from 'react';
import HomePage from './pages/home/HomePage.jsx';
import AttractionsPage from './pages/attractions/AttractionsPage.jsx';
import './App.css';


function currentPage() {
  return window.location.hash.slice(1) === 'explore'
    ? 'explore'
    : 'home';
}


export default function App() {
  const [page, setPage] = useState(currentPage);


  useEffect(() => {
    function navigate() {
      setPage(currentPage());
      window.scrollTo(0, 0);
    }


    window.addEventListener('hashchange', navigate);


    return () => {
      window.removeEventListener('hashchange', navigate);
    };
  }, []);


  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <a className="site-brand" href="#home">
            LakbayNaga
          </a>


          <nav aria-label="Main navigation">
            <a
              href="#home"
              aria-current={page === 'home' ? 'page' : undefined}
            >
              Home
            </a>


            <a
              href="#explore"
              aria-current={page === 'explore' ? 'page' : undefined}
            >
              Attractions
            </a>
          </nav>
        </div>
      </header>


      {page === 'explore' ? (
        <AttractionsPage />
      ) : (
        <main>
          <HomePage />
        </main>
      )}
    </>
  );
}