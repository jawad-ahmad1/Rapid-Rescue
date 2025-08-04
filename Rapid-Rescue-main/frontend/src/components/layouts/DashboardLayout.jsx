import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { 
  FaChartBar, 
  FaUserMd, 
  FaCog, 
  FaTachometerAlt,
  FaClipboardList,
  FaSignOutAlt,
  FaUserCircle,
  FaCaretDown,
  FaCaretRight,
  FaUserPlus,
  FaBars,
  FaTimes,
  FaMapMarkedAlt
} from 'react-icons/fa';
import { useAuth } from '../../services/auth/authContext';
import PropTypes from 'prop-types';

// Styled Components
const DashboardContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: #f8f9fa;
  width: 100vw;
  max-width: 100vw;
  overflow-x: hidden;
  position: relative;
`;

const Sidebar = styled.aside`
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  width: ${props => props.$isCollapsed ? '80px' : '280px'};
  background: #ffffff;
  transition: all 0.3s ease;
  box-shadow: 0 0 15px rgba(0, 0, 0, 0.05);
  z-index: 40;
  display: flex;
  flex-direction: column;

  @media (max-width: 768px) {
    transform: translateX(${props => props.$isOpen ? '0' : '-100%'});
    width: 280px;
  }
`;

const SidebarHeader = styled.div`
  padding: 1.25rem;
  background: linear-gradient(135deg, #4a6cf7 0%, #3651d4 100%);
  color: white;
  display: flex;
  align-items: center;
  gap: 1rem;

  h1 {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0;
    white-space: nowrap;
    opacity: ${props => props.$isCollapsed ? 0 : 1};
    transition: opacity 0.3s ease;
    
    @media (max-width: 768px) {
      opacity: 1;
    }
  }
`;

const LogoIcon = styled.div`
  width: 36px;
  height: 36px;
  min-width: 36px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.5rem;
  color: #4a6cf7;
`;

const MainWrapper = styled.div`
  flex: 1;
  margin-left: ${props => props.$isCollapsed ? '80px' : '280px'};
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  width: calc(100% - ${props => props.$isCollapsed ? '80px' : '280px'});
  position: relative;
  
  @media (max-width: 768px) {
    margin-left: 0;
    width: 100%;
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 1.5rem;
  background: white;
  border-radius: 16px 0 0 16px;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.05);
  min-height: calc(100vh - 3rem);
  width: 100%;
  max-width: 100%;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;

  & > * {
    width: 100%;
    max-width: 100%;
    flex: 1;
  }

  @media (max-width: 768px) {
    border-radius: 0;
    padding: 1rem;
  }
`;

const NavSection = styled.nav`
  flex: 1;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
`;

const NavItem = styled(NavLink)`
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  color: #64748b;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.2s ease;
  gap: 1rem;
  white-space: nowrap;

  &:hover {
    background: rgba(74, 108, 247, 0.08);
    color: #4a6cf7;
  }

  &.active {
    background: rgba(74, 108, 247, 0.12);
    color: #4a6cf7;
    font-weight: 500;
  }

  span {
    opacity: ${props => props.$isCollapsed ? 0 : 1};
    transition: opacity 0.3s ease;
    
    @media (max-width: 768px) {
      opacity: 1;
    }
  }

  svg {
    min-width: 20px;
  }
`;

const SidebarFooter = styled.div`
  padding: 1rem;
  border-top: 1px solid #e2e8f0;
  background: white;
`;

const UserProfile = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(74, 108, 247, 0.08);
  }
`;

const Avatar = styled.div`
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 50%;
  background: #4a6cf7;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
`;

const UserInfo = styled.div`
  opacity: ${props => props.$isCollapsed ? 0 : 1};
  transition: opacity 0.3s ease;
  
  @media (max-width: 768px) {
    opacity: 1;
  }

  h3 {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    color: #1e293b;
  }

  p {
    font-size: 0.75rem;
    color: #64748b;
    margin: 0;
  }
`;

const MobileToggle = styled.button`
  display: none;
  position: fixed;
  top: 1rem;
  left: 1rem;
  z-index: 50;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #4a6cf7;
  color: white;
  border: none;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #3651d4;
  }

  @media (max-width: 768px) {
    display: flex;
  }
`;

const Overlay = styled.div`
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 35;

  @media (max-width: 768px) {
    display: ${props => props.$isOpen ? 'block' : 'none'};
  }
`;

const CollapseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: white;
  border: 1px solid #e2e8f0;
  color: #4a6cf7;
  cursor: pointer;
  transition: all 0.2s ease;
  margin: 1rem auto;

  &:hover {
    background: #f8fafc;
    color: #3651d4;
  }

  @media (max-width: 768px) {
    display: none;
  }
`;

const DashboardLayout = ({ children, role = 'admin' }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Close mobile sidebar when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location]);

  // Close mobile sidebar when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setIsMobileOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Define navigation items based on role
  const adminNavigationItems = [
    { path: '/admin-dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
    { path: '/admin-analytics', icon: <FaChartBar />, label: 'Analytics' },
    { path: '/admin-driver-management', icon: <FaUserMd />, label: 'Driver Management' },
    { path: '/admin-add-driver', icon: <FaUserPlus />, label: 'Add Driver' },
    { path: '/admin-settings', icon: <FaCog />, label: 'Settings' },
  ];

  const driverNavigationItems = [
    { path: '/ambulance-dashboard', icon: <FaTachometerAlt />, label: 'Dashboard' },
    { path: '/ambulance-navigation', icon: <FaMapMarkedAlt />, label: 'Navigation' },
    { path: '/ambulance-history', icon: <FaClipboardList />, label: 'History' },
    { path: '/ambulance-settings', icon: <FaCog />, label: 'Settings' },
  ];

  const navigationItems = role === 'admin' ? adminNavigationItems : driverNavigationItems;

  return (
    <DashboardContainer>
      <Sidebar $isCollapsed={isCollapsed} $isOpen={isMobileOpen}>
        <SidebarHeader $isCollapsed={isCollapsed}>
          <LogoIcon>R</LogoIcon>
          <h1>Rapid Rescue</h1>
        </SidebarHeader>

        <CollapseButton onClick={() => setIsCollapsed(!isCollapsed)}>
          {isCollapsed ? <FaCaretRight /> : <FaCaretDown />}
        </CollapseButton>

        <NavSection>
          {navigationItems.map((item) => (
            <NavItem
              key={item.path}
              to={item.path}
              $isCollapsed={isCollapsed}
              className={({ isActive }) => isActive ? 'active' : ''}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavItem>
          ))}
          <NavItem
            to="#"
            $isCollapsed={isCollapsed}
            onClick={logout}
            style={{ marginTop: 'auto' }}
          >
            <FaSignOutAlt />
            <span>Logout</span>
          </NavItem>
        </NavSection>

        <SidebarFooter>
          <UserProfile>
            <Avatar>
              <FaUserCircle />
            </Avatar>
            <UserInfo $isCollapsed={isCollapsed}>
              <h3>{user?.username || (role === 'admin' ? 'Admin' : 'Driver')}</h3>
              <p>{user?.email || `${role}@rapidrescue.com`}</p>
            </UserInfo>
          </UserProfile>
        </SidebarFooter>
      </Sidebar>

      <MainWrapper $isCollapsed={isCollapsed}>
        <MainContent>
          {children}
        </MainContent>
      </MainWrapper>

      <MobileToggle onClick={() => setIsMobileOpen(!isMobileOpen)}>
        {isMobileOpen ? <FaTimes /> : <FaBars />}
      </MobileToggle>

      <Overlay $isOpen={isMobileOpen} onClick={() => setIsMobileOpen(false)} />
    </DashboardContainer>
  );
};

DashboardLayout.propTypes = {
  children: PropTypes.node.isRequired,
  role: PropTypes.oneOf(['admin', 'driver'])
};

export default DashboardLayout; 