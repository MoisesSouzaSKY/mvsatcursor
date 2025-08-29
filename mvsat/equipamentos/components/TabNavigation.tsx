import React from 'react';

interface TabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: TabItem[];
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  tabs
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      alignItems: 'center', 
      marginBottom: '24px',
      borderBottom: '1px solid #e5e7eb',
      paddingBottom: '0'
    }}>
      {tabs.map((tab) => (
        <button 
          key={tab.id}
          onClick={() => onTabChange(tab.id)} 
          style={{ 
            padding: '12px 20px', 
            borderRadius: '8px 8px 0 0', 
            border: 'none',
            background: activeTab === tab.id ? 'white' : 'transparent',
            cursor: 'pointer', 
            fontWeight: '600',
            fontSize: '14px',
            color: activeTab === tab.id ? '#3b82f6' : '#6b7280',
            transition: 'all 0.2s ease',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderBottom: activeTab === tab.id ? '2px solid #3b82f6' : '2px solid transparent',
            marginBottom: '-1px'
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.backgroundColor = '#f9fafb';
              e.currentTarget.style.color = '#374151';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }
          }}
        >
          {tab.icon && (
            <span style={{ fontSize: '16px' }}>{tab.icon}</span>
          )}
          <span>{tab.label}</span>
          {tab.count !== undefined && (
            <span style={{
              backgroundColor: activeTab === tab.id ? '#3b82f6' : '#9ca3af',
              color: 'white',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '12px',
              fontWeight: '500',
              minWidth: '20px',
              textAlign: 'center',
              transition: 'all 0.2s ease'
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

// Componente para conteúdo das abas
interface TabContentProps {
  activeTab: string;
  tabId: string;
  children: React.ReactNode;
}

export const TabContent: React.FC<TabContentProps> = ({
  activeTab,
  tabId,
  children
}) => {
  if (activeTab !== tabId) return null;

  return (
    <div style={{
      animation: 'fadeIn 0.3s ease-out'
    }}>
      {children}
    </div>
  );
};

// Componente para painel de abas completo
interface TabPanelProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
  tabs: TabItem[];
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({
  activeTab,
  onTabChange,
  tabs,
  children
}) => {
  return (
    <div>
      <TabNavigation 
        activeTab={activeTab}
        onTabChange={onTabChange}
        tabs={tabs}
      />
      <div style={{ marginTop: '0' }}>
        {children}
      </div>
    </div>
  );
};

// Hook para gerenciar estado das abas
export const useTabs = (initialTab: string) => {
  const [activeTab, setActiveTab] = React.useState(initialTab);

  const changeTab = (tabId: string) => {
    setActiveTab(tabId);
  };

  return {
    activeTab,
    changeTab
  };
};

export default TabNavigation;