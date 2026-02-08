# Canvas Lottery Simple

A lightweight, physics-based lottery application built with HTML5 Canvas and Vanilla JavaScript.

## Features

-   **Physics Simulation**: Visualizes participants as bouncing balls with collision mechanics.
-   **Secure Randomness**: Uses `window.crypto` for cryptographically secure winner selection.
-   **Weighted Draw**: Supports assigning weights to participants (more balls = higher chance).
-   **Animations**:
    -   **Rolling**: Fast-paced bouncing physics during the draw.
    -   **Showcase**: Smooth camera-like focus on the winning ball.
    -   **Reveal**: Dramatic winner announcement with confetti effects.
-   **Sound Effects**: (Note: Sound implementation is currently not visible in the code, but visual effects are present).
-   **Responsive Design**: Adapts to different screen sizes.

## Usage

1.  **Open the Application**:
    Simply open the `index.html` file in any modern web browser.

2.  **Add Participants**:
    -   Enter a **Name** in the input field.
    -   (Optional) Set a **Weight** (1-999). A weight of 5 means the person gets 5 balls in the pool.
    -   Click **Add (加入名單)** or press Enter.

3.  **Start the Draw**:
    -   Click the big **Start (開始抽球)** button.
    -   Watch the animation!
    -   The winner will be displayed and added to the "Winners" list on the right.

4.  **Reset**:
    -   Click the **Reset (重置)** button to clear all participants and history.

## Technology Stack

-   **HTML5 Canvas**: For high-performance 2D rendering.
-   **Vanilla JavaScript (`script.js`)**: Core game logic and physics.
-   **CSS3 (`style.css`)**: Layout and component styling.

## Customization

You can easily modify the game rules and physics by editing the `CONFIG` object at the top of `script.js`:

```javascript
const CONFIG = {
    // Game Rules
    MAX_WEIGHT: 999,
    TIMEOUT_ROLLING: 3000,
    
    // Physics & Visuals
    PARTICLE_COUNT: 100,
    // ... and more
};
```
