# Dev Notes

* 'chalk' (as of v5.0.0) has to be left as an external dependency because it erroneously introduces an undefined variable (navigator) that causes it to choke when bundled. We also tried 'cli-color', which had a similar problem (a dependency was trying to extend something that couldn't be extended).
