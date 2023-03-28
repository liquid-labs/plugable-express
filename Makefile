ifneq (grouped-target, $(findstring grouped-target,$(.FEATURES)))
ERROR:=$(error This version of make does not support required 'grouped-target' (4.3+).)
endif

.DELETE_ON_ERROR:
.PHONY: all lint lint-fix test qa
SHELL:=/bin/bash

default: all

NPM_BIN:=npm exec
CATALYST_SCRIPTS:=$(NPM_BIN) catalyst-scripts
BASH_ROLLUP:=$(NPM_BIN) bash-rollup

LIQ_SERVER_SRC:=src/liq-server
LIQ_SERVER_FILES:=$(shell find $(LIQ_SERVER_SRC) \( -name "*.js" -o -name "*.mjs" \) -not -path "*/test/*" -not -name "*.test.js")
ALL_SRC_FILES:=$(shell find $(LIQ_SERVER_SRC) -name "*.js" -o -name "*.mjs")
LIQ_SERVER_TEST_BUILT_FILES=$(patsubst %.mjs, %.js, $(patsubst $(LIQ_SERVER_SRC)/%, test-staging/%, $(ALL_SRC_FILES)))
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
$(LIQ_SERVER_TEST_BUILT_FILES) &: $(ALL_SRC_FILES)
	JS_SRC=$(LIQ_SERVER_SRC) $(CATALYST_SCRIPTS) pretest

$(LIQ_SERVER_TEST_BUILT_DATA): test-staging/%: $(LIQ_SERVER_SRC)%
	@echo "Copying test data..."
	@mkdir -p $(dir $@)
	@cp $< $@


last-test.txt: $(LIQ_SERVER_TEST_BUILT_FILES) $(LIQ_SERVER_TEST_BUILT_DATA)
	# JS_SRC=$(TEST_STAGING) $(CATALYST_SCRIPTS) test | tee last-test.txt
	( set -e; set -o pipefail; \
		JS_SRC=$(TEST_STAGING) $(CATALYST_SCRIPTS) test 2>&1 | tee last-test.txt; )

test: last-test.txt

# lint rules
last-lint.txt: $(ALL_SRC_FILES)
	( set -e; set -o pipefail; \
		JS_LINT_TARGET=$(LIQ_SERVER_SRC) $(CATALYST_SCRIPTS) lint | tee last-lint.txt; )

lint: last-lint.txt

lint-fix:
	JS_LINT_TARGET=$(LIQ_SERVER_SRC) $(CATALYST_SCRIPTS) lint-fix

qa: test lint
