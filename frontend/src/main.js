// frontend/src/main.js
// Main game entry point - GameClient with Three.js integration

import GameClient from './gameClient.js';
import './styles/main.css';

// Import Three.js rendering systems
let threeJSRenderer = null;

async function main() {
  try {
    console.log(' ShipStrike-3D Starting...');

    // Create and initialize game client
    const gameClient = new GameClient();
    await gameClient.init();

    // Make it globally accessible for debugging
    window.gameClient = gameClient;
    window.gameStats = () => gameClient.getStats();

    console.log(' Game ready to play!');
    console.log(' Tip: Use window.gameClient to access the game instance');
    console.log(' Tip: Use window.gameStats() to check game status');

    // TODO: Initialize Three.js renderer when needed
    // const { setupThreeJsRenderer } = await import('./core/renderer.js');
    // threeJSRenderer = setupThreeJsRenderer();

  } catch (error) {
    console.error('❌ Failed to start game:', error);
    const errorHtml = `
      <div style="padding: 20px; color: #ff0000; font-family: Arial;">
        <h1>❌ Game Initialization Failed</h1>
        <p>${error.message}</p>
        <p>Check browser console for more details.</p>
        <hr />
        <details style="margin-top: 20px;">
          <summary>Error Details</summary>
          <pre>${error.stack}</pre>
        </details>
      </div>
    `;
    document.body.innerHTML = errorHtml;
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
