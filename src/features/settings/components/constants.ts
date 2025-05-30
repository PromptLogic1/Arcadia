// Settings component constants and configuration
export const SETTINGS_CONSTANTS = {
  // Form field IDs and names
  FIELDS: {
    NEW_EMAIL: 'new-email',
    CONFIRM_EMAIL: 'confirm-email',
    CURRENT_PASSWORD: 'current-password',
    NEW_PASSWORD: 'new-password',
    CONFIRM_PASSWORD: 'confirm-password',
  },

  // Input placeholders
  PLACEHOLDERS: {
    NEW_EMAIL: 'Enter new email address',
    CONFIRM_EMAIL: 'Confirm new email address',
    CURRENT_PASSWORD: 'Enter current password',
    NEW_PASSWORD: 'Enter new password',
    CONFIRM_PASSWORD: 'Confirm new password',
  },

  // Button texts
  BUTTONS: {
    CHANGE_EMAIL: 'Change Email',
    CHANGE_PASSWORD: 'Change Password',
    UPDATE_EMAIL: 'Update Email',
    UPDATE_PASSWORD: 'Update Password',
    CANCEL: 'Cancel',
    SAVING: 'Saving...',
  },

  // Section labels
  LABELS: {
    ACCOUNT_USERNAME: 'Account Username',
    EMAIL_ADDRESS: 'Email Address',
    PASSWORD: 'Password',
    NEW_EMAIL: 'New Email Address',
    CONFIRM_EMAIL: 'Confirm New Email Address',
    CURRENT_PASSWORD: 'Current Password',
    NEW_PASSWORD: 'New Password',
    CONFIRM_PASSWORD: 'Confirm New Password',
  },

  // Messages
  MESSAGES: {
    PASSWORD_DESCRIPTION: 'Update your account password',
    EMAIL_UPDATE_SUCCESS:
      'Email update initiated! Please check both your current and new email addresses for confirmation links. You need to confirm the change in both emails to complete the update.',
    PASSWORD_UPDATE_SUCCESS:
      'Password updated successfully! Your account is now more secure.',
    EMAIL_TIP:
      "Tip: If you don't see the confirmation emails, please check your spam folder.",
    PASSWORD_TIP: 'Remember to use a strong password and update it regularly.',
    IMPORTANT_INFO_TITLE: 'Important Information',
    EMAIL_CONFIRMATION_INFO:
      'You will need to confirm this change in both your current and new email addresses. Please check both inboxes for confirmation links to complete the update.',
  },

  // Error messages
  ERRORS: {
    EMAIL_MISMATCH: 'New email addresses do not match',
    EMAIL_SAME: 'New email must be different from current email',
    PASSWORD_MISMATCH: 'New passwords do not match',
    CURRENT_PASSWORD_INCORRECT: 'Current password is incorrect',
    EMAIL_UPDATE_FAILED: 'An error occurred while updating email',
    PASSWORD_UPDATE_FAILED: 'An error occurred while updating password',
    GENERIC_FALLBACK: 'Please try again or contact support.',
  },

  // Password requirements
  PASSWORD_REQUIREMENTS: [
    { key: 'uppercase', label: 'Uppercase letter' },
    { key: 'lowercase', label: 'Lowercase letter' },
    { key: 'number', label: 'Number' },
    { key: 'special', label: 'Special character' },
    { key: 'length', label: '8 characters or more' },
  ] as const,

  // Notification timing
  TIMING: {
    SUCCESS_MESSAGE_DURATION: 3000,
    TIP_DELAY: 3000,
  },

  // Style classes
  STYLES: {
    CLOSE_BUTTON:
      'absolute right-2 top-2 rounded-full p-1 hover:bg-gray-700/50',
    SECTION_CONTAINER: 'relative space-y-4 rounded-lg bg-gray-800/30 p-4',
    REQUIREMENTS_CONTAINER:
      'w-full space-y-2 rounded-lg border border-cyan-500/20 bg-gray-800/95 p-4',
    INPUT_STYLE: 'border-cyan-500/20 bg-gray-700/50',
    BUTTON_PRIMARY: 'bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-white',
    BUTTON_OUTLINE: 'border-cyan-500/20 hover:bg-cyan-500/10',
  },
} as const;

// Type definitions for better type safety
export type MessageType = 'success' | 'error' | 'info';

export type PasswordCheck = {
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
  length: boolean;
};

export type FormState = {
  isSubmitting: boolean;
  message: {
    text: string;
    type: MessageType;
  } | null;
};
