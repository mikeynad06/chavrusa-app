import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import VerifyEmailBanner from './VerifyEmailBanner';

export default function MainLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <Navbar />
      <VerifyEmailBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
