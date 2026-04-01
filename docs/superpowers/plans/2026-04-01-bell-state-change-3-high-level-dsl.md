# BellStateChange3 High-Level DSL Plan

1. Rewrite `features/katas/basic_gates/bell_state_change_3.feature` to the same high-level Bell-basis DSL used by BellStateChange1/2.
2. Verify the rewritten feature alone with Cucumber.
3. Verify BellStateChange1/2/3 together to confirm the shared Bell DSL still reads and behaves consistently.
4. Run `bash scripts/setup_symbolic_python.sh` if needed, then run full `bundle exec rake check`.
5. Commit the feature rewrite if all verification passes.

