# Zack's Mohawk Limited
## SpinUp

## Overview

An application for allowing the user to create templates from existing applications, and then spin up new applications from those templates, accelerating the creation of standardised code.

## How To Install

	npm install

## How To Configure

To define which file names or matching file patterns are to be ignored whilst creating templates, please edit the .ignore file.
To define which file types are to be ignored whilst creating templates, please edit the .ignoreFileTypes file.

## How To Setup Command Line Alias

To be able to run SpinUp from any folder on Mac, run the setup script. Setup scripts for Linux and Windows will come soon.

	./setup_mac.sh

## How To Create New Application

	spinup

This will then prompt you for application type and name, and will then create a new application from the chosen template. If no templates yet exist, you will be unable to continue.

## How To Create New Template

In order to turn the current folder into a template, type the following into your terminal:

	templateme

This will then prompt you for the strings in the current folder that are to be replaced, and then save the entire folder as a new template in the templates/ folder of SpinUp.