.PHONY: default setup clean build lint test

# Put Node bins in path
export PATH := node_modules/.bin:$(PATH)

# Set globstar so "**" works for testing
export SHELL := /bin/bash -O globstar

default: build

setup:
	yarn install

clean:
	rm -rf lib

build: clean
	tsc -p tsconfig.build.json

lint:
	tslint --type-check --project tsconfig.json

test:
	ts-node --project tsconfig.test.json \
		node_modules/.bin/blue-tape src/**/*.test.* | tap-spec
