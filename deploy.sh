#!/bin/zsh

# Run Hugo
hugo

# Stage changes and commit using Git
git add .
git commit -m "Updated site content"

# Push changes to HEAD
git push origin HEAD
