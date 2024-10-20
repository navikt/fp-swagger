# fp-swagger

En selvstående swagger-ui klient som klarer å lese flere open-api definisjonene fra underliggende applikasjoner. 

## Tilgang til tjenesten
Tjenesten er sikret med Entra innlogging og sørger for riktig scope veksling ved kall til de underliggende systemer. 

Per i dag er det kun brukere med drift tilgangen som har adgang til tjenesten i produksjon.
Dev miljø er åpen for alle men man trenger drift tilgang til å kunne kalle tjenestene. 

Ved spørsmål ta kontakt med #teamforeldrepenger på Slack.