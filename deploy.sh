#!/bin/zsh

# Get current date and time in format YYYY-MM-DD HH:MM:SS
timestamp=$(date '+%F %T')

# Run Hugo
hugo

# Stage changes and commit using Git
git add .
git commit -m "Publish: $timestamp"

# Push changes to HEAD
git push origin HEAD
