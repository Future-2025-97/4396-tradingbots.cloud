const customStyles = {
	rows: {
		style: {
			minHeight: '45px', // override the row height
            backgroundColor: '#202f3e',
            color: '#fff',
            borderBottom: '1px solid #fff',
            fontSize: '18px',
		},
	},
	headCells: {
		style: {
            backgroundColor: '#202f3e',
            borderBottom: '1px solid #fff',
            color: '#fff',
			paddingLeft: '8px', // override the cell padding for head cells
			paddingRight: '8px',
            fontSize: '18px',
		},
	},
    noData: {
        style: {
            color: '#fff',
            backgroundColor: '#202f3e',
        },
    },
	cells: {
		style: {
			paddingLeft: '8px', // override the cell padding for data cells
			paddingRight: '8px',
            color: '#fff',
            borderBottom: '1px solid #202f3ecb',
            fontSize: '18px',
		},
	},
    pagination: {
        style: {
            color: '#fff',
            backgroundColor: '#202f3e',
            fontSize: '18px',
        },
    },
};

export default customStyles;
