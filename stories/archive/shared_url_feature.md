# Shareable URL Feature

## Story
As a project planner, I want to share my backlog and matrix with team members through a unique URL so that we can collaborate on prioritization in real-time.

## Acceptance Criteria
- Unique URLs/paths load specific backlogs, scenarios, presets, and project settings
- Real-time updates from multiple users viewing the same URL (via Convex)
- Share functionality with "Copy to Clipboard" button
- Metrics tracking: visitors count, current viewers, share count
- Security options: password protection with optional 2FA
- Tiered pricing based on project complexity:
  - 1-10 points: FREE
  - 11-50 points: $10
  - 51-100 points: $50
  - 100+ points: $250

## Technical Requirements
- Dynamic routing in Next.js
- Convex real-time database integration
- Stripe payment processing
- Basic analytics implementation
- Secure authentication for password protection
