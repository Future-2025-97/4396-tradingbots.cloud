217.77.13.217      root   .E~DX-$8Qf.E~DX-$8Qf


htaccess:
<IfModule mod_rewrite.c>
RewriteEngine On
RewriteBase /subdirectory
RewriteRule ^index\.html$ - [L]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteCond %{REQUEST_FILENAME} !-l
RewriteRule . /index.html [L]
</IfModule>

nginx:
location / {
		try_files $uri /index.html;
	}



amllimitedhk@gmail.com

http://www.tradingbots.cloud
address: 6AGGdVJSLNZkWNJ8uQZXkS1omVPGRKhNvVSFshAFMvLo

API key: boMmyAgh6vRKplnWUaoI9kOhSTF5cUo3tusXF5Zgys8JCzWKqFooMELLZNCf0fej

Secret key: s0qQ2gCNzyH0kkhAbE4pZyLYPN7un7HpzEWppZDhDZc5sI1tWwGtibo3Jb0LEGlo


helius API key for helius:bad5ab60-f610-45bf-8afa-34d2e8bc5108

https://api.helius.xyz/v0/transactions/?api-key=bad5ab60-f610-45bf-8afa-34d2e8bc5108


shyft api key: wI0PAkt71h_QUlWQ


6LdLnZQqAAAAACul4WHLFX1KJ6id6qT8uYNM-gr-
6LdLnZQqAAAAADf4iWAcT-wPzbtqNYJyYBf6fOik


as  you can see, there are many tokens
problem is that bot can set which token as copy token

which token will bot set as copy token in those?
so In my old logic, I have to set copy token highest price value like-Shiba-ELITE.
but for set highest price value token, we need to compare all tokens in their wallet.

so I think we need to know all tokens price.
as you can see, token price value-for example here 3468$ is not related with token balance.
even though token balance is smaller than Mikawa token balance, this price value is higher than it, so I need all tokens price
