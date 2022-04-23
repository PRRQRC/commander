cp data/backup.json data/backup-copy.json
git checkout .
branch=$(git branch --show-current)
git pull origin $branch
npm install
cp data/backup.json data/backup-remote.json
mv data/backup-copy.json data/backup.json
