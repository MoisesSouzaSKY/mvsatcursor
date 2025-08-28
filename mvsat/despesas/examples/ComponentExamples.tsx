import React from 'react';
import {
  StatCard,
  EnhancedButton,
  StatusBadge,
  LoadingSpinner,
  ErrorMessage,
  Toast,
  SkeletonLoader
} from '../index';

// Exemplo de uso dos componentes
export const ComponentExamples: React.FC = () => {
  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      
      {/* StatCard Examples */}
      <section>
        <h2>StatCard Examples</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          <StatCard
            title="Total Revenue"
            value="R$ 125.430"
            icon="💰"
            color="green"
            subtitle="This month"
            trend={{ value: 12, isPositive: true }}
          />
          
          <StatCard
            title="Active Users"
            value="1,234"
            icon="👥"
            color="blue"
            subtitle="Online now"
          />
          
          <StatCard
            title="Pending Tasks"
            value="23"
            icon="📋"
            color="yellow"
            subtitle="Requires attention"
            trend={{ value: 5, isPositive: false }}
          />
          
          <StatCard
            title="System Health"
            value="98.5%"
            icon="⚡"
            color="purple"
            subtitle="Uptime"
          />
        </div>
      </section>

      {/* EnhancedButton Examples */}
      <section>
        <h2>EnhancedButton Examples</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <EnhancedButton variant="primary" size="sm">
            Primary Small
          </EnhancedButton>
          
          <EnhancedButton variant="success" size="md">
            Success Medium
          </EnhancedButton>
          
          <EnhancedButton variant="danger" size="lg">
            Danger Large
          </EnhancedButton>
          
          <EnhancedButton variant="warning" size="md" loading>
            Loading...
          </EnhancedButton>
          
          <EnhancedButton variant="secondary" size="md" disabled>
            Disabled
          </EnhancedButton>
        </div>
      </section>

      {/* StatusBadge Examples */}
      <section>
        <h2>StatusBadge Examples</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <StatusBadge status="pago" />
          <StatusBadge status="pendente" />
          <StatusBadge status="vencido" />
          <StatusBadge status="cancelado" />
        </div>
      </section>

      {/* LoadingSpinner Examples */}
      <section>
        <h2>LoadingSpinner Examples</h2>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <LoadingSpinner size="sm" />
          <LoadingSpinner size="md" text="Loading..." />
          <LoadingSpinner size="lg" color="#10b981" text="Processing..." />
        </div>
      </section>

      {/* ErrorMessage Examples */}
      <section>
        <h2>ErrorMessage Examples</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <ErrorMessage
            type="error"
            title="Connection Error"
            message="Unable to connect to the server. Please check your internet connection."
            onRetry={() => alert('Retry clicked')}
          />
          
          <ErrorMessage
            type="warning"
            message="Your session will expire in 5 minutes."
            onClose={() => alert('Close clicked')}
          />
          
          <ErrorMessage
            type="info"
            message="New features are available! Check out the latest updates."
          />
        </div>
      </section>

      {/* SkeletonLoader Examples */}
      <section>
        <h2>SkeletonLoader Examples</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h3>Card Skeleton</h3>
            <SkeletonLoader type="card" count={3} />
          </div>
          
          <div>
            <h3>Table Skeleton</h3>
            <SkeletonLoader type="table" />
          </div>
          
          <div>
            <h3>Text Skeleton</h3>
            <SkeletonLoader type="text" count={3} />
          </div>
          
          <div>
            <h3>Button Skeleton</h3>
            <SkeletonLoader type="button" count={2} />
          </div>
        </div>
      </section>

      {/* Toast Example */}
      <section>
        <h2>Toast Example</h2>
        <div style={{ position: 'relative', height: '200px', border: '1px dashed #ccc', borderRadius: '8px' }}>
          <Toast
            message="This is a success notification!"
            type="success"
            isVisible={true}
            onClose={() => console.log('Toast closed')}
            position="top-right"
          />
        </div>
      </section>

    </div>
  );
};

export default ComponentExamples;