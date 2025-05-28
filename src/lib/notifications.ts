/**
 * Notification utility for showing user-friendly messages
 * Using shadcn toast components for consistent UI
 */

import { useToast } from '@/src/components/ui/use-toast';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface NotificationOptions {
  title?: string;
  description?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

class NotificationManager {
  private getToastVariant(type: NotificationType): 'default' | 'destructive' {
    return type === 'error' ? 'destructive' : 'default';
  }

  private getDefaultTitle(type: NotificationType): string {
    switch (type) {
      case 'success':
        return 'Success';
      case 'error':
        return 'Error';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Notification';
    }
  }

  private show(
    type: NotificationType,
    message: string,
    options?: NotificationOptions
  ) {
    const title = options?.title || this.getDefaultTitle(type);
    const variant = this.getToastVariant(type);

    // Get the toast store instance and show the toast
    const { showToast } = useToast.getState();
    showToast({
      title,
      description: message,
      variant,
    });
  }

  success(message: string, options?: NotificationOptions): void {
    this.show('success', message, options);
  }

  error(message: string, options?: NotificationOptions): void {
    this.show('error', message, options);
  }

  warning(message: string, options?: NotificationOptions): void {
    this.show('warning', message, options);
  }

  info(message: string, options?: NotificationOptions): void {
    this.show('info', message, options);
  }

  // Specialized notifications for common use cases
  saveSuccess(itemName = 'item'): void {
    this.success(`${itemName} saved successfully!`);
  }

  saveError(itemName = 'item', error?: string): void {
    this.error(`Failed to save ${itemName}`, {
      description:
        error || 'Please try again or contact support if the problem persists.',
    });
  }

  deleteSuccess(itemName = 'item'): void {
    this.success(`${itemName} deleted successfully!`);
  }

  deleteError(itemName = 'item'): void {
    this.error(`Failed to delete ${itemName}`, {
      description:
        'Please try again or contact support if the problem persists.',
    });
  }

  connectionError(): void {
    this.error('Connection Error', {
      description:
        'Unable to connect to the server. Please check your internet connection.',
      action: {
        label: 'Retry',
        onClick: () => window.location.reload(),
      },
    });
  }

  permissionError(): void {
    this.error('Permission Denied', {
      description: 'You do not have permission to perform this action.',
    });
  }

  validationError(fieldName: string): void {
    this.warning('Validation Error', {
      description: `Please check the ${fieldName} field and try again.`,
    });
  }

  // Game-specific notifications
  gameJoinSuccess(gameName: string): void {
    this.success(`Joined ${gameName} successfully!`);
  }

  gameJoinError(gameName: string, reason?: string): void {
    this.error(`Failed to join ${gameName}`, {
      description: reason || 'The game may be full or no longer available.',
    });
  }

  gameStarted(gameName: string): void {
    this.info(`${gameName} has started!`, {
      description: 'Good luck and have fun!',
    });
  }

  gameEnded(winner?: string): void {
    if (winner) {
      this.success('Game Ended!', {
        description: `${winner} won the game!`,
      });
    } else {
      this.info('Game Ended!', {
        description: 'Thanks for playing!',
      });
    }
  }

  // Board/Card operations
  cardAlreadyInGrid(): void {
    this.warning('Duplicate Card', {
      description: 'This card is already placed in the grid.',
    });
  }

  boardCreationSuccess(): void {
    this.success('Board Created!', {
      description: 'Your board has been created successfully.',
    });
  }

  boardCreationError(error?: string): void {
    this.error('Failed to Create Board', {
      description: error || 'Please check your input and try again.',
    });
  }

  // Auth notifications
  loginSuccess(username?: string): void {
    this.success('Welcome back!', {
      description: username
        ? `Welcome back, ${username}!`
        : 'You have been logged in successfully.',
    });
  }

  logoutSuccess(): void {
    this.info('Logged Out', {
      description: 'You have been logged out successfully.',
    });
  }

  emailVerificationSent(): void {
    this.info('Verification Email Sent', {
      description: 'Please check your email and click the verification link.',
    });
  }

  passwordResetSent(): void {
    this.info('Password Reset Email Sent', {
      description: 'Please check your email for password reset instructions.',
    });
  }

  // Network status notifications
  networkOffline(): void {
    this.warning('Connection Lost', {
      description:
        'You are currently offline. Some features may not be available.',
      duration: 0, // Don't auto-dismiss
    });
  }

  networkOnline(): void {
    this.success('Connection Restored', {
      description: 'You are back online!',
    });
  }

  // Copy to clipboard notifications
  copySuccess(item = 'text'): void {
    this.success(`${item} copied to clipboard!`);
  }

  copyError(): void {
    this.error('Failed to copy to clipboard', {
      description: 'Please try copying manually.',
    });
  }
}

// Export singleton instance
export const notifications = new NotificationManager();

// Export convenience functions
export const notify = {
  success: (message: string, options?: NotificationOptions) =>
    notifications.success(message, options),
  error: (message: string, options?: NotificationOptions) =>
    notifications.error(message, options),
  warning: (message: string, options?: NotificationOptions) =>
    notifications.warning(message, options),
  info: (message: string, options?: NotificationOptions) =>
    notifications.info(message, options),

  // Specialized shortcuts
  saveSuccess: (itemName?: string) => notifications.saveSuccess(itemName),
  saveError: (itemName?: string, error?: string) =>
    notifications.saveError(itemName, error),
  deleteSuccess: (itemName?: string) => notifications.deleteSuccess(itemName),
  deleteError: (itemName?: string) => notifications.deleteError(itemName),
  connectionError: () => notifications.connectionError(),
  permissionError: () => notifications.permissionError(),
  cardAlreadyInGrid: () => notifications.cardAlreadyInGrid(),
  copySuccess: (item?: string) => notifications.copySuccess(item),
  copyError: () => notifications.copyError(),
};
