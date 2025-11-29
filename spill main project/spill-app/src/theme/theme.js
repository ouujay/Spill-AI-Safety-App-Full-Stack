const light = {
  mode: 'light',
  colors: {
    primary: '#fefef9', // Cream background instead of white
    secondary: '#111111',
    accent: '#8b16ff',
    surface: '#f9f8f3', // Slightly darker cream for surfaces
    text: '#111111',
    card: '#f5f4ef', // Cream tint for cards
    upvote: '#8b16ff',
    downvote: '#cccccc',
    redFlag: '#f23e52',
    greenFlag: '#26d08c',
    border: '#e8e7e2', // Cream-tinted border
    // Apple Pink additions
    applePink: '#ff9fb2', // Main Apple pink color
    applePinkLight: '#ffb3c6', // Lighter Apple pink
    applePinkAccent: '#ff8fa8', // Deeper Apple pink for accents
  },
};

const dark = {
  mode: 'dark',
  colors: {
    primary: '#111111',
    secondary: '#ffffff',
    accent: '#8b16ff',
    surface: '#222032',
    text: '#ffffff',
    card: '#1d1b26',
    upvote: '#8b16ff',
    downvote: '#555555',
    redFlag: '#f23e52',
    greenFlag: '#26d08c',
    border: '#282838',
    // Apple Pink additions for dark mode
    applePink: '#ff9fb2',
    applePinkLight: '#ffb3c6',
    applePinkAccent: '#ff8fa8',
  },
};

export const themes = { light, dark };