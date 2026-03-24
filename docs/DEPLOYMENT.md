# Deployment Guide

This document outlines how to deploy the multiplayer Tic-Tac-Toe app as a single, full-stack Docker package onto a free Virtual Private Server (VPS). 

## Full Stack Docker Deployment
By packaging the Frontend (Nginx), Backend (Nakama), and Database (PostgreSQL) together on the same EC2 instance, we eliminate all CORS policies, HTTPS mixed-content blocks, and Ngrok tunnels. Players connect directly via standard HTTP to the EC2's IP.

We recommend deploying on the **AWS EC2 Free Tier** (`t2.micro` or `t3.micro`) or **Google Cloud Platform** (`e2-micro`). 

### 1. Provision & Configure the VPS
1. **Launch a Server:** Spin up an Ubuntu Linux instance on EC2 or GCP.
2. **Open the Ports:** In your Cloud Provider's Security Groups (Firewall), you **must** add Inbound Rules allowing:
   *   **HTTP (Port 80):** To serve the React frontend via Nginx.
   *   **Custom TCP (Port 7350):** To allow the frontend to tunnel WebSockets directly into Nakama.

### 2. Install Dependencies
SSH into your server and run:
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose git npm
```

### 3. Clone and Compile
Pull down your repository and statically compile both the backend rules and the React frontend.
```bash
git clone https://github.com/AviralJ58/Tic-Tac-Toe.git
cd Tic-Tac-Toe

# Build Backend Engine
cd nakama
npm ci
npm run build

# Build Frontend UI
cd ../frontend
npm ci
npm run build
```
*(Note: Because the frontend script uses `window.location.hostname` to auto-detect its environment natively, you do not need to configure any `.env` environment variables!)*

### 4. Launch the Ecosystem
With both `dist` folders compiled successfully, Docker Compose will launch the Database, boot the Server, and map the UI cleanly to port 80:
```bash
cd ../infra
sudo docker-compose up -d
```

That's it! Open your browser and navigate straight to your server's Public IP address (e.g. `http://YOUR.EC2.IP.ADDRESS`). The game will instantly render and connect!
