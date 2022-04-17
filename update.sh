git checkout .
branch=$(git branch --show-current)
git pull origin $branch
npm install
