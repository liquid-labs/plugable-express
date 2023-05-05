LIQ_SERVER_WORKERS_SRC:=$(shell find $(CATALYST_JS_LIB_SRC_PATH) -type f -name "*.worker.js")
LIQ_SERVER_WORKERS:=$(addprefix ./dist/workers/, $(notdir $(LIQ_SERVER_WORKERS_SRC)))

BUILD_TARGETS+=$(LIQ_SERVER_WORKERS)

define WORKER_RULE
$$(addprefix ./dist/workers/, $$(notdir $(1))): $(1)
	mkdir -p $$(dir $$@)
	cp $$< $$@
	
endef
$(foreach worker, $(LIQ_SERVER_WORKERS_SRC), $(eval $(call WORKER_RULE, $(worker))))