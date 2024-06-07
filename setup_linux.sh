#!/bin/bash

touch ~/.bashrc

SPINUPSET=false
TEMPLATEMESET=false

while read -r line
do
	if [[ "$line" =~ ^"alias spinup="* ]]; then
		SPINUPSET=true
	fi
done < ~/.bashrc

while read -r line
do
	if [[ "$line" =~ ^"alias templateme="* ]]; then
		TEMPLATEMESET=true
	fi
done < ~/.bashrc

NEWLINESET=false

if [[ "$SPINUPSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'spinup' alias";
	echo "alias spinup='dt=\$(pwd); cd $(pwd); node SpinUp.js -folderPath \$dt; cd \$dt;'" >> ~/.bashrc
fi

if [[ "$TEMPLATEMESET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.bashrc
		NEWLINESET=true
	fi
	echo "Setting 'templateme' alias";
	echo "alias templateme='dt=\$(pwd); cd $(pwd); node SpinUp.js -template \$dt; cd \$dt;'" >> ~/.bashrc
fi

source ~/.bashrc

echo "Setup complete"