read -p "dev, beta, prod: " str1

echo "cd /opt/latest"
cd /opt/latest/we-heart-fans
# echo "clone master branch"
# echo "git clone --branch honeydrip-master git@gitlab.com:westofhudsongroup/we-heart-fans.git"

echo "git reset --hard"
git reset --hard

echo "git rebase --abort"
git rebase --abort

if [ "$str1" == "beta" ]; then
    read -p "branch name: " branch_name

    echo "git pull origin" $branch_name
    git pull origin $branch_name
elif [ "$str1" == "dev" ]; then
    echo "git pull origin develop"
    git pull origin develop
else
    echo "git pull origin honeydrip-master"
    git pull origin honeydrip-master
fi

echo "overwriting api folder"
sudo rsync -rz /opt/latest/we-heart-fans/api/ /opt/xFan/api/
echo "sudo chown -R centos /opt/"
sudo chown -R centos /opt/

echo "building api"
cd /opt/xFan/api/
echo "rm .env"
sudo rm .env

echo ".env"
if [ "$str1" == "beta" ]; then
    echo "sudo mv .env.beta .env"
    sudo mv .env.beta .env
elif [ "$str1" == "dev" ]; then
    echo "sudo mv .env.dev .env"
    sudo mv .env.dev .env
else
    echo "sudo mv .env.prod .env"
    sudo mv .env.prod .env
fi

yarn install
yarn build
echo "restarting pm2 api"
pm2 restart api
