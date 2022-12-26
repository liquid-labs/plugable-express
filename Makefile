.DELETE_ON_ERROR:
.PHONY: all test lint lint-fix

default: all

NPM_BIN:=npm exec
CATALYST_SCRIPTS:=$(NPM_BIN) catalyst-scripts
BASH_ROLLUP:=$(NPM_BIN) bash-rollup

LIQ_SERVER_SRC:=src/liq-server
LIQ_SERVER_FILES:=$(shell find $(LIQ_SERVER_SRC) \( -name "*.js" -o -name "*.mjs" \) -not -path "*/test/*" -not -name "*.test.js")
LIQ_SERVER_TEST_SRC_FILES:=$(shell find $(LIQ_SERVER_SRC) -name "*.js" -o -name "*.mjs")
LIQ_SERVER_TEST_BUILT_FILES=$(patsubst %.mjs, %.js, $(patsubst $(LIQ_SERVER_SRC)/%, test-staging/%, $(LIQ_SERVER_TEST_SRC_FILES)))
LIQ_SERVER_TEST_SRC_DATA:=$(shell find $(LIQ_SERVER_SRC) -path "*/data/*" -type f -o -name "*.csv")
LIQ_SERVER_TEST_BUILT_DATA:=$(patsubst $(LIQ_SERVER_SRC)%, test-staging/%, $(LIQ_SERVER_TEST_SRC_DATA))
LIQ_SERVER_BIN:=dist/liq-server.js

LIQ_SERVER_WORKERS_SRC:=$(shell find $(LIQ_SERVER_SRC) -type f -name "*.worker.js")
LIQ_SERVER_WORKERS:=$(addprefix ./dist/workers/, $(notdir $(LIQ_SERVER_WORKERS_SRC)))

CLI_SRC=src/cli
CLI_SRC_ROOT:=$(CLI_SRC)/liq-server.sh
CLI_SRC_FILES:=$(shell find $(CLI_SRC) -not -name "$(notdir $(CLI_SRC_ROOT))")
CLI_BIN:=dist/liq-server.sh

BUILD_TARGETS:=$(LIQ_SERVER_BIN) $(CLI_BIN) $(LIQ_SERVER_WORKERS)

all: $(BUILD_TARGETS)

# build rules
$(LIQ_SERVER_BIN): package.json $(LIQ_SERVER_FILES)
	JS_SRC=$(LIQ_SERVER_SRC) $(CATALYST_SCRIPTS) build

define WORKER_RULE
$$(addprefix ./dist/workers/, $$(notdir $(1))): $(1)
	mkdir -p $$(dir $$@)
	cp $$< $$@
	
endef
$(foreach worker, $(LIQ_SERVER_WORKERS_SRC), $(eval $(call WORKER_RULE, $(worker))))

$(CLI_BIN): $(CLI_SRC_ROOT) $(CLI_SRC_FILES)
	mkdir -p $(dir $@)
	$(BASH_ROLLUP) $< $@

# test build and run rules
$(LIQ_SERVER_TEST_BUILT_FILES) &: $(LIQ_SERVER_TEST_SRC_FILES)
	JS_SRC=$(LIQ_SERVER_SRC) $(CATALYST_SCRIPTS) pretest

$(LIQ_SERVER_TEST_BUILT_DATA): test-staging/%: $(LIQ_SERVER_SRC)%
	@echo "Copying test data..."
	@mkdir -p $(dir $@)
	@cp $< $@

test: $(LIQ_SERVER_TEST_BUILT_FILES) $(LIQ_SERVER_TEST_BUILT_DATA)
	JS_SRC=test-staging $(CATALYST_SCRIPTS) test

# lint rules
lint:
	JS_SRC=$(LIQ_SERVER_SRC) $(CATALYST_SCRIPTS) lint

lint-fix:
	JS_SRC=$(LIQ_SERVER_SRC) $(CATALYST_SCRIPTS) lint-fix
