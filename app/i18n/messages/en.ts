import type { Messages } from '@/app/i18n/messages/es'

/** English dictionary. It must have the same shape as the Spanish one (es.ts), which the compiler checks. */
export const en: Messages = {
  common: {
    cancel: 'Cancel',
    close: 'Close',
    loading: 'Loading...'
  },
  nav: {
    myProfile: 'My profile',
    logout: 'Sign out'
  },
  metadata: {
    mainMenu: 'Main menu',
    world: 'The world',
    verifyEmail: 'Verify your email',
    register: 'Create account',
    forgotPassword: 'Recover password',
    newPassword: 'New password',
    login: 'Sign in',
    offline: 'Offline',
    profile: 'My profile',
    privacy: 'Privacy policy',
    deleteAccount: 'Delete account'
  },
  pwa: {
    description:
      'Turn-based fantasy RPG: explore a maze-like world, defeat bosses, rescue your companions and descend into the Abyss.',
    installPrompt:
      'Install Crisol on your phone and play full screen, with an icon on your home screen like any other game.',
    install: 'Install',
    offlineTitle: 'No signal',
    offlineText: 'Crisol needs the internet for this screen. Check your connection and try again.'
  },
  landing: {
    tagline: 'Aurenya is fading. Rescue the bearers of the Flame and descend into the Abyss to face Crisol.',
    playFree: 'Play for free',
    steps: {
      explore: {
        title: 'Explore',
        text: 'Over a thousand points joined by trails, nine biomes and a fog that only lifts as you advance.'
      },
      fight: {
        title: 'Fight',
        text: 'Turn-based battles ruled by speed: choose your attacks, specials and targets with care.'
      },
      rise: {
        title: 'Rise again',
        text: 'Every time Crisol falls it returns stronger: endless New Game+ to keep improving your party.'
      }
    }
  },
  auth: {
    email: 'Email',
    password: 'Password',
    playerName: 'Player name',
    lastName: 'Last name',
    login: {
      title: 'Sign in',
      subtitle: 'Where are you? Come in and prove it.',
      google: 'Continue with Google',
      or: 'or',
      verified: 'Your email has been verified. You can now sign in.',
      passwordReset: 'Your password has been updated. You can now sign in.',
      invalidCredentials: 'Wrong email or password (or the account has not been verified yet)',
      submit: 'Sign in',
      forgotPassword: 'Forgot your password?',
      noAccount: "Don't have an account?",
      register: 'Sign up'
    },
    register: {
      title: 'Create account',
      verifyTitle: 'Verify your email',
      verifySent: 'We sent a verification link to {email}. Check your inbox and click it to activate your account.',
      alreadyActivated: 'Already activated it?',
      login: 'Sign in',
      passwordHint: 'At least 6 characters',
      repeatPassword: 'Repeat password',
      passwordsMismatch: "Passwords don't match",
      passwordsMismatchDot: "Passwords don't match.",
      submit: 'Create account',
      haveAccount: 'Already have an account?'
    },
    forgot: {
      title: 'Recover password',
      sent: 'If there is an account associated with {email}, you will receive an email with instructions to reset your password.',
      subtitle: "Enter your email and we'll send you a link to reset your password.",
      submit: 'Send link',
      back: 'Back to sign in'
    },
    reset: {
      title: 'New password',
      newPassword: 'New password',
      confirmPassword: 'Confirm password',
      submit: 'Save password',
      requestNew: 'Request a new link'
    },
    verify: {
      expiredTitle: 'Link expired',
      expiredText:
        'The verification link has expired. Sign up again with the same email and we will send you a new one.',
      invalidTitle: 'Invalid link',
      invalidText: 'The verification link is not valid or has already been used.',
      title: 'Verify your email',
      text: 'Check your inbox and click the verification link to activate your account.',
      registerAgain: 'Sign up again'
    },
    resetInvalid: 'The link is not valid or has already been used.',
    goToLogin: 'Go to sign in',
    somethingWentWrong: 'Something went wrong. Please try again.',
    emails: {
      verifySubject: 'Activate your Crisol account',
      resetSubject: 'Reset your Crisol password',
      greeting: 'Hi {name}!',
      verifyIntro: 'Thanks for joining Crisol. To activate your account and start playing, verify your email:',
      verifyAction: 'Verify my email',
      verifyFooter: "The link is valid for {hours} hours. If you didn't create this account, ignore this message.",
      resetIntro: 'We received a request to reset the password of your Crisol account.',
      resetAction: 'Reset password',
      resetFooter: "The link is valid for {hours} hour. If you didn't request this change, ignore this message."
    }
  },
  account: {
    profile: 'My profile',
    playerNameTitle: 'Player name',
    lastNameTitle: 'Last name',
    nicknameTitle: 'Nickname',
    nicknameHint: 'If set, it is shown instead of your name and last name',
    save: 'Save',
    saved: 'Profile updated!',
    languageLabel: 'App language',
    delete: {
      section: 'Delete account',
      description: 'Your account, your player name, your email and your saved game are deleted. It cannot be undone.',
      button: 'Delete my account',
      title: 'Delete your account?',
      warning:
        'Your account and your saved game, with all your characters, will be deleted forever. This cannot be undone.',
      confirmWord: 'DELETE',
      confirmLabel: 'Type {word} to confirm',
      confirm: 'Delete forever'
    }
  },
  legal: {
    privacyLink: 'Privacy policy',
    updatedAt: 'Last updated: {date}',
    privacy: {
      title: 'Privacy policy',
      intro:
        'Crisol is a single player turn-based fantasy role-playing game. This policy explains what data we keep, what we use it for and how you can delete it.',
      data: {
        title: 'What data we keep',
        text: 'When you create your account: your email, your player name and your password (stored encrypted, never in plain text). If you sign in with Google, Google gives us your email and your name. We also keep the language you choose and your saved game: your characters, your progress on the map, your items and your play time.'
      },
      use: {
        title: 'What we use it for',
        text: "Only to make the game work: signing in, saving your game so you can continue it on any device, and sending you the account verification and password recovery emails. We don't sell your data."
      },
      thirdParties: {
        title: 'Third-party services',
        text: 'We use Google for Google sign-in and the app usage statistics (Google Analytics through Google Tag Manager); Vercel to host the app; a PostgreSQL database provider to store the data; and Resend to send the emails. Each of them handles data under its own privacy policy.'
      },
      storage: {
        title: 'Cookies and storage',
        text: "We use one cookie to keep you signed in and another to remember your language. The browser's local storage keeps a copy of your game so you can play offline, and device preferences, such as having closed the install prompt."
      },
      retention: {
        title: 'How long we keep it',
        text: 'Your account and your saved game are kept until you delete them. Starting a new game replaces the previous one.'
      },
      deletion: {
        title: 'How to delete your data',
        text: "You can delete your account at any time from My profile → Delete account: your account and your saved game are deleted right away. If you can't sign in, write to {email} from your account's email and we will delete it for you."
      },
      security: {
        title: 'Security',
        text: 'All communication with Crisol is encrypted (HTTPS) and passwords are stored with a secure hash (bcrypt).'
      },
      children: {
        title: 'Children',
        text: "Crisol is not directed at children under 13 and we don't knowingly collect data from children under that age. If you believe a child gave us their data, write to {email} and we will delete it."
      },
      changes: {
        title: 'Changes and contact',
        text: 'If we change this policy, we will update the date above. For any question about your data, write to {email}.'
      }
    },
    deleteAccount: {
      title: 'Delete your Crisol account',
      intro: 'You can delete your account and all your data from the app, at any time:',
      steps: {
        signIn: 'Sign in to Crisol with your account.',
        profile: "Open your player's menu and choose My profile.",
        confirm: 'Tap Delete my account and confirm by typing DELETE.'
      },
      whatTitle: 'What is deleted',
      whatText:
        'Your account (email, player name and password) and your saved game, with all your characters, are deleted right away and forever. We keep no copy.',
      noAccessTitle: "Can't sign in?",
      noAccessText: "Write to {email} from your account's email asking us to delete it, and we will do it for you.",
      goToProfile: 'Go to My profile'
    }
  },
  home: {
    tagline: 'Aurenya is fading. Only the First Flame can stop Crisol.',
    continue: 'Continue',
    newGame: 'New game',
    cycle: 'NG+{cycle}',
    saveCharacters: { one: '{count} character', other: '{count} characters' },
    saveLevel: 'Level {level}',
    newGameConfirm: {
      title: 'Start a new game?',
      text: 'Your saved game is deleted, with all your characters and their progress. This cannot be undone.',
      confirm: 'Start over'
    }
  },
  world: {
    title: 'Aurenya',
    level: 'Level {level}',
    comingSoon: 'The world map arrives in the next phase.',
    backToMenu: 'Back to menu',
    camps: {
      start: 'Glade of Awakening'
    }
  },
  characters: {
    kael: { name: 'Kael' },
    sera: { name: 'Sera' },
    brann: { name: 'Brann' },
    oren: { name: 'Oren' },
    ysolde: { name: 'Ysolde' }
  },
  errors: {
    internal: 'Internal error',
    notAuthenticated: 'User not authenticated',
    unauthorized: 'Unauthorized',
    playerNameRequired: 'Choose a player name',
    playerNameTooLong: 'The player name can have up to 40 characters',
    lastNameTooLong: 'The last name can have up to 40 characters',
    nicknameTooLong: 'The nickname can have up to 40 characters',
    invalidLocale: 'Invalid language',
    saveNotFound: "You don't have a saved game",
    invalidSave: 'The saved game is not valid',
    saveOutdated: 'Your game moved on in another device: load it again',
    emailRequired: 'Enter your email',
    invalidEmail: 'The email is not valid',
    passwordTooShort: 'The password must be at least {min} characters long',
    emailAlreadyRegistered: 'The email is already registered',
    fillAllFields: 'Fill in all the fields',
    linkInvalidOrUsed: 'The link is not valid or has already been used',
    linkExpired: 'The link has expired. Request a new one'
  }
}
