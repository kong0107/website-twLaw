#!/usr/bin/env bash
#
# Only for Openshift to download law database from GitHub
#
# One argument is required: the tag name for the GitHub repository.
# The JSON files are reserved in case `import.js` is updated and you wanna use them again.
#
if [[ "$#" -eq 1 ]] ; then
	echo "Error: require specify tag name"
	exit 1
fi

cd $OPENSHIFT_DATA_DIR
wget  https://github.com/kong0107/mojLawSplitJSON/archive/$1.tar.gz
if [[ $? -ne 0 ]] ; then
	exit 1
fi

rm -rf json
tar -zx -f $1.tar.gz
rm $1.tar.gz
mv mojLawSplitJSON-$1 json

rm -rf json/HisMingLing
rm -rf json/Eng_FalVMingLing

cd $OPENSHIFT_REPO_DIR
node import.js
