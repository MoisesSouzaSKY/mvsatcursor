import React from 'react';
import { render, screen } from '@testing-library/react';
import StatCard from '../components/StatCard';

describe('StatCard', () => {
  const defaultProps = {
    title: 'Test Title',
    value: '100',
    icon: '📊',
    color: 'blue' as const
  };

  it('renders title and value correctly', () => {
    render(<StatCard {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('renders subtitle when provided', () => {
    render(<StatCard {...defaultProps} subtitle="Test Subtitle" />);
    
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('renders trend when provided', () => {
    const trend = { value: 15, isPositive: true };
    render(<StatCard {...defaultProps} trend={trend} />);
    
    expect(screen.getByText(/15%/)).toBeInTheDocument();
    expect(screen.getByText(/vs mês anterior/)).toBeInTheDocument();
  });

  it('applies correct color scheme for different colors', () => {
    const { rerender } = render(<StatCard {...defaultProps} color="green" />);
    
    // Test that component renders without errors for different colors
    rerender(<StatCard {...defaultProps} color="red" />);
    rerender(<StatCard {...defaultProps} color="yellow" />);
    rerender(<StatCard {...defaultProps} color="purple" />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('handles numeric values', () => {
    render(<StatCard {...defaultProps} value={1234} />);
    
    expect(screen.getByText('1234')).toBeInTheDocument();
  });
});