NPM_BIN:=$(shell npm bin)
CATALYST_SCRIPTS:=$(NPM_BIN)/catalyst-scripts

LIQ_SERVER_SRC=src/liq-server
LIQ_SERVER_FILES=$(shell find src/liq-server -name "*.js")
LIQ_SERVER_BIN=dist/liq-server.js

BUILD_TARGETS:=$(LIQ_SERVER_BIN)

all: $(BUILD_TARGETS)

$(LIQ_SERVER_BIN): package.json $(LIQ_SERVER_FILES)
	JS_SRC=$(LIQ_SERVER_SRC) JS_OUT=$@ $(CATALYST_SCRIPTS) build
