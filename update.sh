cd $OPENSHIFT_DATA_DIR
wget  https://github.com/kong0107/mojLawSplitJSON/archive/$1.tar.gz
rm -rf json
tar -zx -f $1.tar.gz
mv mojLawSplitJSON-$1 json
rm -rf json/HisMingLing
rm -rf json/Eng_MingLing
rm -rf json/Eng_FalV
mv json/UpdateDate.txt ${OPENSHIFT_REPO_DIR}data
node ${OPENSHIFT_REPO_DIR}import.js
