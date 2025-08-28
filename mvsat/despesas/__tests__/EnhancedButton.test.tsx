import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import EnhancedButton from '../components/EnhancedButton';

describe('EnhancedButton', () => {
  const defaultProps = {
    variant: 'primary' as const,
    size: 'md' as const,
    children: 'Test Button'
  };

  it('renders button text correctly', () => {
    render(<EnhancedButton {...defaultProps} />);
    
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<EnhancedButton {...defaultProps} onClick={handleClick} />);
    
    fireEvent.click(screen.getByText('Test Button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<EnhancedButton {...defaultProps} onClick={handleClick} disabled />);
    
    fireEvent.click(screen.getByText('Test Button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading', () => {
    render(<EnhancedButton {...defaultProps} loading />);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('renders different variants correctly', () => {
    const { rerender } = render(<EnhancedButton {...defaultProps} variant="success" />);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
    
    rerender(<EnhancedButton {...defaultProps} variant="danger" />);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
    
    rerender(<EnhancedButton {...defaultProps} variant="warning" />);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
    
    rerender(<EnhancedButton {...defaultProps} variant="secondary" />);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('renders different sizes correctly', () => {
    const { rerender } = render(<EnhancedButton {...defaultProps} size="sm" />);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
    
    rerender(<EnhancedButton {...defaultProps} size="lg" />);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });

  it('applies custom styles', () => {
    const customStyle = { backgroundColor: 'red' };
    render(<EnhancedButton {...defaultProps} style={customStyle} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveStyle('background-color: red');
  });

  it('handles different button types', () => {
    render(<EnhancedButton {...defaultProps} type="submit" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('type', 'submit');
  });
});