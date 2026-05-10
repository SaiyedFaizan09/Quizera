# Quizera - A Complete Platform For Quiz

Quizera is a dynamic and feature-rich full-stack web application designed for creating, managing, and taking quizzes. Built with the MERN stack, it provides a seamless experience for both quiz creators and participants, offering a robust set of tools for educational, professional, or recreational use.

## Key Features

Quizera is divided into two main user experiences: the **Creator Dashboard** and the **Participant Dashboard**.

### For Quiz Creators

*   **Secure Authentication**: Safe and secure user registration and login system.
*   **Creator Dashboard**: A centralized hub to view, manage, and analyze all created quizzes.
*   **Intuitive Quiz Builder**: A multi-step, user-friendly interface to create quizzes with advanced settings:
    *   **Flexible Timing**: Set timers for the whole quiz or on a per-question basis.
    *   **Advanced Rules**: Enable question shuffling and apply negative marking for incorrect answers.
    *   **Question Types**: Supports single-choice (radio) questions.
*   **Quiz Management**:
    *   Set unique passcodes for secure quiz access.
    *   Schedule quizzes to go live at a specific date and time.
    *   Manually control quiz status (Go Live, Close).
    *   Publish results for participants to view.
*   **In-Depth Analytics**:
    *   View detailed responses and performance statistics for each quiz.
*   **Quiz Vaults**:
    *   Organize quizzes into collections called "Vaults".
    *   Generate and download comprehensive CSV reports for entire vaults, perfect for tracking performance across multiple quizzes.

### For Quiz Participants

*   **Participant Dashboard**: A personalized space to track past quiz attempts and performance.
*   **Easy Access**: Join a quiz easily with a unique Quiz Code and Passcode.
*   **Engaging Quiz Experience**: A clean, focused interface for taking quizzes, with real-time timers.
*   **Instant Feedback**: View detailed results and answer breakdowns immediately after the creator publishes them.
*   **Performance Tracking**: Access analytics within "Vaults" to see your performance in groups of related quizzes.

## Tech Stack

Quizera is built using modern, powerful technologies to ensure a scalable and maintainable application.

### Backend

*   **Framework**: [Node.js](https://nodejs.org/) with [Express.js](https://expressjs.com/)
*   **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/) for object data modeling.
*   **Authentication**: [JSON Web Tokens (JWT)](https://jwt.io/) for secure, stateless authentication.
*   **Security**: [bcrypt.js](https://github.com/dcodeIO/bcrypt.js) for password hashing.
*   **Scheduling**: [node-cron](https://github.com/node-cron/node-cron) for handling scheduled quiz publishing.
*   **Environment**: `dotenv` for managing environment variables.

### Frontend

*   **Library**: [React.js](https://reactjs.org/) (using functional components and hooks).
*   **Routing**: [React Router](https://reactrouter.com/) for seamless client-side navigation.
*   **State Management**: [React Context API](https://reactjs.org/docs/context.html) for global state management (e.g., user info).
*   **HTTP Client**: [Axios](https://axios-http.com/) for making API requests to the backend.
*   **Styling**: A combination of CSS-in-JS (style objects) and global CSS with variables for a consistent and themeable design.
*   **Icons**: [React Icons](https://react-icons.github.io/react-icons/) for a rich set of UI icons.

================================================================================

## ⚙️ Getting Started

To get the project up and running on your local machine, follow these steps.

### Prerequisites

*   Node.js and npm
*   MongoDB (local instance or a cloud service like MongoDB Atlas)

### Backend Setup

1.  Navigate to the `backend` directory:
    ```sh
    cd backend
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Create a `.env` file in the `backend` directory and add your configuration:
    ```
    // filepath: backend/.env
    PORT=5000
    MONGO_URI=your_mongodb_connection_string
    JWT_SECRET=your_jwt_secret_key
    ```
4.  Start the backend server:
    ```sh
    npm start
    ```
    The server will be running on `http://localhost:5000`.

### Frontend Setup

1.  Navigate to the `client` directory:
    ```sh
    cd client
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```
3.  Start the React development server:
    ```sh
    npm start
    ```
    The application will open in your browser at `http://localhost:3000`.

---

Thank you for checking out Quizera!
