#!/bin/bash

touch ~/.zshrc

SPINUPSET=false
TEMPLATEMESET=false

while read -r line
do
	if [[ "$line" =~ ^"alias spinup="* ]]; then
		SPINUPSET=true
	fi
done < ~/.zshrc

while read -r line
do
	if [[ "$line" =~ ^"alias templateme="* ]]; then
		TEMPLATEMESET=true
	fi
done < ~/.zshrc

NEWLINESET=false

if [[ "$SPINUPSET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.zshrc
		NEWLINESET=true
	fi
	echo "Setting 'spinup' alias";
	echo "alias spinup='dt=\$(pwd); cd $(pwd); node SpinUp.js -folderPath \$dt; cd \$dt;'" >> ~/.zshrc
fi

if [[ "$TEMPLATEMESET" != true ]]; then
	if [[ "$NEWLINESET" != true ]]; then
		echo '' >> ~/.zshrc
		NEWLINESET=true
	fi
	echo "Setting 'templateme' alias";
	echo "alias templateme='dt=\$(pwd); cd $(pwd); node SpinUp.js -template \$dt; cd \$dt;'" >> ~/.zshrc
fi

source ~/.zshrc

echo "Setup complete"