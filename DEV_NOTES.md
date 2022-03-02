# Dev Notes

* 'chalk' (as of v5.0.0) has to be left as an external dependency because it erroneously introduces an undefined variable (navigator) that causes it to choke when bundled. We also tried 'cli-color', which had a similar problem (a dependency was trying to extend something that couldn't be extended).
* 'json-diff' (as of 0.7.1) has to be left as an external. When transpiled, we get a complaint re. changing a constant value so we have to leave it as an external.
* 'find-plugins (as of 1.1.7) has to be left as an external... I think. But didn't note why exactly at the time.
