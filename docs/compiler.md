# IntentCode Compiler

## Analyzer vs Indexer approaches

The compiler supports two approaches to supporting the compilation of
IntentCode to source: analyzer-based and indexer-based.

The analyzer is the recommended and default approach.


### Analyzer

The analyzer looks for errors and potential improvements and generates a report
of suggestions by priority.

The highest priority suggestions (p1 and p2) are usually good options to be
approved. All approved suggestions are implemented by the analyzer to the
IntentCode.

This process should be done at least once after every major change to the
IntentCode to fix errors and resolve ambiguities.


### Indexer

The indexer processes each IntentCode file with the context of all available
data, including other IntentCode files. This metadata is saved in the internal
graph in the database.

Where the Analyzer needs changes to IntentCode to prevent errors, the indexer
doesn't need those changes, and will make assumptions that will enable the
correct compilation of IntentCode to source. The problem is, if the source is
removed and the IntentCode recompiled, the assumptions made in the next build
could be very different.


### Changing the approach

The approach is currently specified in the code (only):
- ServerOnlyTypes.compilerMetaDataApproach.

