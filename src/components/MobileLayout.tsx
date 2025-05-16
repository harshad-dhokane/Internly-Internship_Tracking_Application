
import { ReactNode } from 'react';
import MobileNavbar from './MobileNavbar';

interface MobileLayoutProps {
  children: ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
  return (
    <div className="mobile-container bg-intern-secondary">
      <div className="mobile-content safe-area">
        {children}
      </div>
      <MobileNavbar />
    </div>
  );
};

export default MobileLayout;
