# Kittens Game Fixtures

`m2-save.json` is an upstream save-format fixture generated against the
locked Kittens Game source in the local validation reference. It provides an
early-game state with kittens, unlocked jobs, research, crafting recipes,
workshop upgrades, a policy, and enough resources to exercise the native M2
commands without weakening production rules.

The fixture is loaded through the same localStorage key and upstream load path
used by real saves. Tests do not mutate manager internals after load.
