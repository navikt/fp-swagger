# fp-swagger

Swagger UI aggregator for administration (forvaltning) OpenAPI definitions across Team Foreldrepenger services.

## Shared context

- Source of truth for shared domain, architecture, and conventions: `navikt/fp-context`
- Copilot Space: `navikt/TeamForeldrepenger`

## Repo-specific context

| Topic | Details                                                                       |
|---|-------------------------------------------------------------------------------|
| Role | Aggregates multiple backend OpenAPI definitions behind one UI and proxy layer |
| Consumers          | Team Foreldrepenger                                                           |
| Tech stack | Stateless Express utility app                                                 |
| Main integrations  | All foreldrepenger apps with an forvaltning RS app                            |

This is an administrative / operational utility app, not a business-rules or domain service

## Verification

- Verify changes manually using `navikt/fp-autotest` with a local build and running one test case.
