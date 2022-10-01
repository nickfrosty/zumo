# zumo

> NOTE: This repo will be treated with a `beta` status until v1.0.0

Utility helpers for creating markdown based sites, with a focus on Next.JS

## Publishing New Package Versions

After changes are made, create a `changeset` via:

```bash
yarn changeset
```

When ready to publish a new version of all the modified packages:

```bash
yarn changeset version && yarn changeset tag
```

Commit all changes, followed by a push following tags.

```bash
git push --follow-tags
```

Finally, to push the new release to the public:

```bash
yarn changeset publish
```
